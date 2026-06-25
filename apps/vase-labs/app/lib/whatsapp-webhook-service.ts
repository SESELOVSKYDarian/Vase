import { Prisma, type PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type { InboundChannelMessage, LabsChannel, LabsChannelProvider } from "@vase/contracts";
import { canTenantUseChannel, createRuntimeEntitlement, type LabsRuntimeEntitlement } from "./billing";
import { resolveMetaWebhookVerifyToken } from "./meta-webhook";
import { verifyMetaSignature } from "./meta-signature";
import { readWhatsAppProviderConfig } from "./whatsapp-provider";
import { parseWhatsAppWebhookMessage } from "./whatsapp-webhook";

export type WhatsAppWebhookContext = {
  assistantId: string;
  globalTenantId: string;
  tenantSlug: string;
  channel: {
    id: string;
    provider: LabsChannelProvider | null;
    status: string;
    config: Record<string, unknown> | null;
  } | null;
  entitlement: LabsRuntimeEntitlement | null;
};

export type PersistInboundMessageInput = {
  context: WhatsAppWebhookContext;
  message: InboundChannelMessage;
  aiBlockedReason: string | null;
};

export type PersistInboundMessageResult = {
  conversationId: string;
  messageId: string;
  aiBlockedReason: string | null;
};

export interface WhatsAppWebhookRepository {
  findContextByTenantSlug(tenantSlug: string): Promise<WhatsAppWebhookContext | null>;
  persistInboundMessage(input: PersistInboundMessageInput): Promise<PersistInboundMessageResult>;
}

export type WebhookVerifyResult =
  | { status: 200; body: string }
  | { status: 403; body: string };

export type WebhookPostResult = {
  status: number;
  body: {
    ok: boolean;
    ignored?: boolean;
    processed?: boolean;
    reason?: string;
    conversationId?: string;
    messageId?: string;
    aiBlockedReason?: string | null;
  };
};

type AssistantRow = {
  id: string;
  globalTenantId: string;
  tenantSlug: string | null;
};

type ChannelRow = {
  id: string;
  provider: LabsChannelProvider | null;
  status: string;
  config: unknown;
};

type EntitlementRow = {
  globalTenantId: string;
  plan: LabsRuntimeEntitlement["plan"];
  status: LabsRuntimeEntitlement["status"];
  enabledChannels: LabsChannel[];
  tokenPack: LabsRuntimeEntitlement["tokenPack"];
  tokensIncluded: number;
  tokensUsed: number;
  extraTokens: number;
  currentPeriodStart: Date | null;
  renewsAt: Date | null;
};

type ConversationRow = { id: string; metadata: unknown };
type IdRow = { id: string };

function normalizeRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function metadataJson(value: Record<string, unknown>) {
  return Prisma.sql`CAST(${JSON.stringify(value)} AS jsonb)`;
}

function messageContent(message: InboundChannelMessage) {
  const text = message.text?.trim();
  if (text) return text;
  return `[${message.messageType}]`;
}

function mergeConversationMetadata(metadata: unknown, input: PersistInboundMessageInput) {
  const current = normalizeRecord(metadata) ?? {};
  const context = normalizeRecord(current.context) ?? {};

  return {
    ...current,
    state: typeof current.state === "string" ? current.state : "IDLE",
    context: {
      ...context,
      source: "whatsapp",
      provider: input.message.provider ?? "META_OFFICIAL",
      aiBlockedReason: input.aiBlockedReason,
    },
  };
}

function buildMessageMetadata(input: PersistInboundMessageInput) {
  return {
    provider: input.message.provider ?? "META_OFFICIAL",
    externalMessageId: input.message.externalMessageId ?? null,
    messageType: input.message.messageType,
    mediaId: input.message.mediaId ?? null,
    aiBlockedReason: input.aiBlockedReason,
    rawPayload: input.message.rawPayload ?? null,
  };
}

function buildRuntimeEntitlement(row: EntitlementRow | undefined): LabsRuntimeEntitlement | null {
  if (!row) return null;

  return createRuntimeEntitlement({
    globalTenantId: row.globalTenantId,
    plan: row.plan,
    status: row.status,
    enabledChannels: row.enabledChannels,
    tokenPack: row.tokenPack,
    tokensIncluded: row.tokensIncluded,
    tokensUsed: row.tokensUsed,
    extraTokens: row.extraTokens,
    currentPeriodStart: row.currentPeriodStart?.toISOString() ?? null,
    renewsAt: row.renewsAt?.toISOString() ?? null,
  });
}

export class PrismaWhatsAppWebhookRepository implements WhatsAppWebhookRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findContextByTenantSlug(tenantSlug: string): Promise<WhatsAppWebhookContext | null> {
    const assistants = await this.prisma.$queryRaw<AssistantRow[]>`
      SELECT id, "globalTenantId", "tenantSlug"
      FROM "Assistant"
      WHERE "tenantSlug" = ${tenantSlug}
      LIMIT 1
    `;
    const assistant = assistants[0];
    if (!assistant || !assistant.tenantSlug) return null;

    const channels = await this.prisma.$queryRaw<ChannelRow[]>`
      SELECT id, provider, status, config
      FROM "Channel"
      WHERE "assistantId" = ${assistant.id}
        AND type = 'WHATSAPP'
        AND (provider IS NULL OR provider = 'META_OFFICIAL')
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;
    const entitlements = await this.prisma.$queryRaw<EntitlementRow[]>`
      SELECT
        "globalTenantId",
        plan,
        status,
        "enabledChannels",
        "tokenPack",
        "tokensIncluded",
        "tokensUsed",
        "extraTokens",
        "currentPeriodStart",
        "renewsAt"
      FROM "LabsEntitlement"
      WHERE "globalTenantId" = ${assistant.globalTenantId}
      LIMIT 1
    `;

    const channel = channels[0];

    return {
      assistantId: assistant.id,
      globalTenantId: assistant.globalTenantId,
      tenantSlug: assistant.tenantSlug,
      channel: channel
        ? {
            id: channel.id,
            provider: channel.provider,
            status: channel.status,
            config: normalizeRecord(channel.config),
          }
        : null,
      entitlement: buildRuntimeEntitlement(entitlements[0]),
    };
  }

  async persistInboundMessage(input: PersistInboundMessageInput): Promise<PersistInboundMessageResult> {
    const now = new Date();
    const existing = await this.prisma.$queryRaw<ConversationRow[]>`
      SELECT id, metadata
      FROM "Conversation"
      WHERE "assistantId" = ${input.context.assistantId}
        AND channel = 'WHATSAPP'
        AND "externalThreadKey" = ${input.message.externalThreadKey}
      LIMIT 1
    `;

    let conversation = existing[0];

    if (!conversation) {
      const conversationId = randomUUID();
      const created = await this.prisma.$queryRaw<ConversationRow[]>`
        INSERT INTO "Conversation" (
          id,
          "assistantId",
          channel,
          status,
          "externalUserId",
          "externalThreadKey",
          "customerName",
          "customerContact",
          metadata,
          "messageCount",
          "lastMessageAt",
          "lastInboundAt",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${conversationId},
          ${input.context.assistantId},
          'WHATSAPP',
          'OPEN',
          ${input.message.customerContact ?? null},
          ${input.message.externalThreadKey},
          ${input.message.customerName ?? null},
          ${input.message.customerContact ?? null},
          ${metadataJson(mergeConversationMetadata(null, input))},
          0,
          ${now},
          ${now},
          ${now},
          ${now}
        )
        RETURNING id, metadata
      `;
      conversation = created[0];
    }

    const nextMetadata = mergeConversationMetadata(conversation.metadata, input);

    await this.prisma.$executeRaw`
      UPDATE "Conversation"
      SET
        metadata = ${metadataJson(nextMetadata)},
        "customerName" = COALESCE(${input.message.customerName ?? null}, "customerName"),
        "customerContact" = COALESCE(${input.message.customerContact ?? null}, "customerContact"),
        "messageCount" = "messageCount" + 1,
        "lastMessageAt" = ${now},
        "lastInboundAt" = ${now},
        "updatedAt" = ${now}
      WHERE id = ${conversation.id}
    `;

    const messageId = randomUUID();
    const messages = await this.prisma.$queryRaw<IdRow[]>`
      INSERT INTO "Message" (
        id,
        "conversationId",
        role,
        direction,
        content,
        "providerMessageId",
        metadata,
        "createdAt"
      )
      VALUES (
        ${messageId},
        ${conversation.id},
        'user',
        'INBOUND',
        ${messageContent(input.message)},
        ${input.message.externalMessageId ?? null},
        ${metadataJson(buildMessageMetadata(input))},
        ${now}
      )
      RETURNING id
    `;

    return {
      conversationId: conversation.id,
      messageId: messages[0]?.id ?? "",
      aiBlockedReason: input.aiBlockedReason,
    };
  }
}

export function getWebhookVerifyResult(input: {
  context: WhatsAppWebhookContext | null;
  url: string;
}): WebhookVerifyResult {
  const params = new URL(input.url).searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (!input.context || !input.context.channel?.config) {
    return { status: 403, body: "Forbidden" };
  }

  const providerConfig = readWhatsAppProviderConfig(input.context.channel.config);
  const expectedToken = resolveMetaWebhookVerifyToken(input.context.globalTenantId, providerConfig.verifyToken);

  if (mode === "subscribe" && token && token === expectedToken && challenge) {
    return { status: 200, body: challenge };
  }

  return { status: 403, body: "Forbidden" };
}

export async function verifyWhatsAppWebhookSubscription(input: {
  repository: WhatsAppWebhookRepository;
  tenantSlug: string;
  url: string;
}): Promise<WebhookVerifyResult> {
  const context = await input.repository.findContextByTenantSlug(input.tenantSlug);
  return getWebhookVerifyResult({ context, url: input.url });
}

export async function handleWhatsAppMetaWebhook(input: {
  repository: WhatsAppWebhookRepository;
  tenantSlug: string;
  rawBody: string;
  signatureHeader: string | null;
}): Promise<WebhookPostResult> {
  const context = await input.repository.findContextByTenantSlug(input.tenantSlug);

  if (!context?.channel?.config) {
    return {
      status: 200,
      body: { ok: true, ignored: true, reason: "channel_not_configured" },
    };
  }

  const providerConfig = readWhatsAppProviderConfig(context.channel.config);

  if (!providerConfig.appSecret || !verifyMetaSignature(providerConfig.appSecret, input.rawBody, input.signatureHeader)) {
    return {
      status: 401,
      body: { ok: false, reason: "invalid_signature" },
    };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(input.rawBody);
  } catch {
    return {
      status: 200,
      body: { ok: true, ignored: true, reason: "invalid_json" },
    };
  }

  const message = parseWhatsAppWebhookMessage({
    globalTenantId: context.globalTenantId,
    payload,
    channelType: "WHATSAPP",
    provider: "META_OFFICIAL",
  });

  if (!message) {
    return {
      status: 200,
      body: { ok: true, ignored: true },
    };
  }

  const access = context.entitlement ? canTenantUseChannel(context.entitlement, "WHATSAPP") : null;
  const aiBlockedReason = access?.allowed ? null : access?.reason ?? "ENTITLEMENT_NOT_FOUND";
  const persisted = await input.repository.persistInboundMessage({
    context,
    message,
    aiBlockedReason,
  });

  return {
    status: 200,
    body: {
      ok: true,
      processed: true,
      conversationId: persisted.conversationId,
      messageId: persisted.messageId,
      aiBlockedReason,
    },
  };
}
