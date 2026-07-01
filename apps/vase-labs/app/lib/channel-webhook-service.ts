import { Prisma, type PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type { InboundChannelMessage, LabsChannel, LabsChannelProvider } from "@vase/contracts";
import { canTenantUseChannel, createRuntimeEntitlement, type LabsRuntimeEntitlement } from "./billing";
import { resolveMetaWebhookVerifyToken } from "./meta-webhook";
import { verifyMetaSignature } from "./meta-signature";

export type ChannelWebhookContext = {
  assistantId: string;
  globalTenantId: string;
  tenantSlug: string;
  channelType: LabsChannel;
  channel: {
    id: string;
    provider: LabsChannelProvider | null;
    status: string;
    config: Record<string, unknown> | null;
  } | null;
  entitlement: LabsRuntimeEntitlement | null;
};

export type PersistChannelInboundMessageInput = {
  context: ChannelWebhookContext;
  message: InboundChannelMessage;
  aiBlockedReason: string | null;
};

export type PersistChannelInboundMessageResult = {
  conversationId: string;
  messageId: string;
  aiBlockedReason: string | null;
};

export interface ChannelWebhookRepository {
  findContextByTenantSlug(tenantSlug: string, channelType: LabsChannel): Promise<ChannelWebhookContext | null>;
  markWebhookEventProcessing?(input: {
    context: ChannelWebhookContext;
    providerEventId?: string | null;
    providerMessageId?: string | null;
    rawPayload?: unknown;
  }): Promise<{ duplicate: boolean }>;
  markWebhookEventProcessed?(input: {
    context: ChannelWebhookContext;
    providerMessageId?: string | null;
    conversationId: string;
    messageId: string;
  }): Promise<void>;
  markWebhookEventFailed?(input: {
    context: ChannelWebhookContext;
    providerMessageId?: string | null;
    reason: string;
  }): Promise<void>;
  persistInboundMessage(input: PersistChannelInboundMessageInput): Promise<PersistChannelInboundMessageResult>;
}

export type ChannelWebhookVerifyResult =
  | { status: 200; body: string }
  | { status: 403; body: string };

export type ChannelWebhookPostResult = {
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

export type ParseChannelWebhookMessage = (input: {
  globalTenantId: string;
  payload: unknown;
}) => InboundChannelMessage | null;

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

function enumValue(channelType: LabsChannel) {
  return Prisma.sql`CAST(${channelType} AS "LabsChannel")`;
}

function messageContent(message: InboundChannelMessage) {
  const text = message.text?.trim();
  if (text) return text;
  return `[${message.messageType}]`;
}

function readMetaChannelProviderConfig(config: unknown) {
  const source = normalizeRecord(config) ?? {};
  return {
    appSecret: typeof source.appSecret === "string" ? source.appSecret : undefined,
    verifyToken: typeof source.verifyToken === "string" ? source.verifyToken : undefined,
  };
}

function isConnectedChannel(context: ChannelWebhookContext) {
  return context.channel?.status === "CONNECTED";
}

function resolveAiBlockedReason(entitlement: LabsRuntimeEntitlement | null, channelType: LabsChannel) {
  if (!entitlement) return "ENTITLEMENT_NOT_FOUND";

  const access = canTenantUseChannel(entitlement, channelType);
  if (access.allowed) return null;

  return access.reason === "CHANNEL_NOT_INCLUDED" ? "CHANNEL_NOT_ENTITLED" : access.reason;
}

function mergeConversationMetadata(metadata: unknown, input: PersistChannelInboundMessageInput) {
  const current = normalizeRecord(metadata) ?? {};
  const context = normalizeRecord(current.context) ?? {};
  const source = input.message.channelType.toLowerCase();

  return {
    ...current,
    state: typeof current.state === "string" ? current.state : "IDLE",
    context: {
      ...context,
      source,
      provider: input.message.provider ?? "META_OFFICIAL",
      aiBlockedReason: input.aiBlockedReason,
    },
  };
}

function buildMessageMetadata(input: PersistChannelInboundMessageInput) {
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

export class PrismaChannelWebhookRepository implements ChannelWebhookRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findContextByTenantSlug(tenantSlug: string, channelType: LabsChannel): Promise<ChannelWebhookContext | null> {
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
        AND type = ${enumValue(channelType)}
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
      channelType,
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

  async persistInboundMessage(input: PersistChannelInboundMessageInput): Promise<PersistChannelInboundMessageResult> {
    const now = new Date();
    const channelType = input.message.channelType;
    const existing = await this.prisma.$queryRaw<ConversationRow[]>`
      SELECT id, metadata
      FROM "Conversation"
      WHERE "assistantId" = ${input.context.assistantId}
        AND channel = ${enumValue(channelType)}
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
          ${enumValue(channelType)},
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

  async markWebhookEventProcessing(input: {
    context: ChannelWebhookContext;
    providerEventId?: string | null;
    providerMessageId?: string | null;
    rawPayload?: unknown;
  }): Promise<{ duplicate: boolean }> {
    if (!input.context.channel?.id || !input.providerMessageId) {
      return { duplicate: false };
    }

    try {
      await this.prisma.$executeRaw`
        INSERT INTO "WebhookEvent" (
          id,
          "channelId",
          "providerEventId",
          "providerMessageId",
          status,
          metadata,
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${randomUUID()},
          ${input.context.channel.id},
          ${input.providerEventId ?? null},
          ${input.providerMessageId},
          'PROCESSING',
          ${metadataJson({ rawPayload: input.rawPayload ?? null })},
          ${new Date()},
          ${new Date()}
        )
      `;
      return { duplicate: false };
    } catch {
      return { duplicate: true };
    }
  }

  async markWebhookEventProcessed(input: {
    context: ChannelWebhookContext;
    providerMessageId?: string | null;
    conversationId: string;
    messageId: string;
  }): Promise<void> {
    if (!input.context.channel?.id || !input.providerMessageId) return;

    await this.prisma.$executeRaw`
      UPDATE "WebhookEvent"
      SET
        status = 'PROCESSED',
        "processedAt" = ${new Date()},
        metadata = ${metadataJson({ conversationId: input.conversationId, messageId: input.messageId })},
        "updatedAt" = ${new Date()}
      WHERE "channelId" = ${input.context.channel.id}
        AND "providerMessageId" = ${input.providerMessageId}
    `;
  }

  async markWebhookEventFailed(input: {
    context: ChannelWebhookContext;
    providerMessageId?: string | null;
    reason: string;
  }): Promise<void> {
    if (!input.context.channel?.id || !input.providerMessageId) return;

    await this.prisma.$executeRaw`
      UPDATE "WebhookEvent"
      SET
        status = 'FAILED',
        "failedAt" = ${new Date()},
        metadata = ${metadataJson({ reason: input.reason })},
        "updatedAt" = ${new Date()}
      WHERE "channelId" = ${input.context.channel.id}
        AND "providerMessageId" = ${input.providerMessageId}
    `;
  }
}

export function getChannelWebhookVerifyResult(input: {
  context: ChannelWebhookContext | null;
  url: string;
}): ChannelWebhookVerifyResult {
  const params = new URL(input.url).searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (!input.context || !input.context.channel?.config) {
    return { status: 403, body: "Forbidden" };
  }

  const providerConfig = readMetaChannelProviderConfig(input.context.channel.config);
  const expectedToken = resolveMetaWebhookVerifyToken(input.context.globalTenantId, providerConfig.verifyToken);

  if (mode === "subscribe" && token && token === expectedToken && challenge) {
    return { status: 200, body: challenge };
  }

  return { status: 403, body: "Forbidden" };
}

export async function verifyMetaChannelWebhookSubscription(input: {
  channelType: LabsChannel;
  repository: ChannelWebhookRepository;
  tenantSlug: string;
  url: string;
}): Promise<ChannelWebhookVerifyResult> {
  const context = await input.repository.findContextByTenantSlug(input.tenantSlug, input.channelType);
  return getChannelWebhookVerifyResult({ context, url: input.url });
}

export async function handleMetaChannelWebhook(input: {
  channelType: LabsChannel;
  repository: ChannelWebhookRepository;
  tenantSlug: string;
  rawBody: string;
  signatureHeader: string | null;
  parseMessage: ParseChannelWebhookMessage;
}): Promise<ChannelWebhookPostResult> {
  const context = await input.repository.findContextByTenantSlug(input.tenantSlug, input.channelType);

  if (!context?.channel?.config) {
    return {
      status: 200,
      body: { ok: true, ignored: true, reason: "channel_not_configured" },
    };
  }

  if (!isConnectedChannel(context)) {
    return {
      status: 200,
      body: { ok: true, ignored: true, reason: "channel_not_connected" },
    };
  }

  const providerConfig = readMetaChannelProviderConfig(context.channel.config);

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

  const message = input.parseMessage({
    globalTenantId: context.globalTenantId,
    payload,
  });

  if (!message) {
    return {
      status: 200,
      body: { ok: true, ignored: true },
    };
  }

  const event = await input.repository.markWebhookEventProcessing?.({
    context,
    providerEventId: message.externalMessageId,
    providerMessageId: message.externalMessageId,
    rawPayload: message.rawPayload,
  });

  if (event?.duplicate) {
    return {
      status: 200,
      body: { ok: true, processed: false, reason: "duplicate" },
    };
  }

  const aiBlockedReason = resolveAiBlockedReason(context.entitlement, input.channelType);
  let persisted: PersistChannelInboundMessageResult;
  try {
    persisted = await input.repository.persistInboundMessage({
      context,
      message,
      aiBlockedReason,
    });
    await input.repository.markWebhookEventProcessed?.({
      context,
      providerMessageId: message.externalMessageId,
      conversationId: persisted.conversationId,
      messageId: persisted.messageId,
    });
  } catch (error) {
    await input.repository.markWebhookEventFailed?.({
      context,
      providerMessageId: message.externalMessageId,
      reason: error instanceof Error ? error.message : "PERSIST_FAILED",
    });
    throw error;
  }

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
