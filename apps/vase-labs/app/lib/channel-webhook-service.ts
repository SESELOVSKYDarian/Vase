import { Prisma, type PrismaClient } from "./db";
import { randomUUID } from "node:crypto";
import type { InboundChannelMessage, LabsChannel, LabsChannelProvider } from "@vase/contracts";
import { canTenantUseChannel, createRuntimeEntitlement, type LabsRuntimeEntitlement } from "./billing";
import { resolveMetaWebhookVerifyToken } from "./meta-webhook";
import { getManualChannelId } from "./channel-manual-setup";
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
  findManualSubscriptionContext?(tenantSlug: string, channelType: LabsChannel): Promise<ChannelWebhookContext | null>;
  markSubscriptionVerified?(context: ChannelWebhookContext): Promise<void>;
  findContextByProviderAccountId?(
    channelType: LabsChannel,
    providerAccountId: string,
  ): Promise<ChannelWebhookContext | null>;
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

type ProviderChannelRow = ChannelRow & {
  assistantId: string;
  globalTenantId: string;
  tenantSlug: string | null;
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

const allowedChannels: LabsChannel[] = ["WHATSAPP", "INSTAGRAM", "FACEBOOK"];

function normalizeRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function normalizeEnabledChannels(value: unknown): LabsChannel[] {
  if (Array.isArray(value)) {
    return value.filter((channel): channel is LabsChannel =>
      allowedChannels.includes(channel as LabsChannel),
    );
  }

  if (typeof value === "string") {
    try {
      return normalizeEnabledChannels(JSON.parse(value));
    } catch {
      return value
        .split(",")
        .map((channel) => channel.trim())
        .filter((channel): channel is LabsChannel =>
          allowedChannels.includes(channel as LabsChannel),
        );
    }
  }

  return [];
}

function metadataJson(value: Record<string, unknown>) {
  return Prisma.sql`${JSON.stringify(value)}`;
}

function enumValue(channelType: LabsChannel) {
  return Prisma.sql`${channelType}`;
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
    enabledChannels: normalizeEnabledChannels(row.enabledChannels),
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
      SELECT id, globalTenantId, tenantSlug
      FROM Assistant
      WHERE tenantSlug = ${tenantSlug}
      LIMIT 1
    `;
    const assistant = assistants[0];
    if (!assistant || !assistant.tenantSlug) return null;

    const channels = await this.prisma.$queryRaw<ChannelRow[]>`
      SELECT id, provider, status, config
      FROM Channel
      WHERE assistantId = ${assistant.id}
        AND type = ${enumValue(channelType)}
        AND (provider IS NULL OR provider = 'META_OFFICIAL')
      ORDER BY createdAt DESC
      LIMIT 1
    `;
    const entitlements = await this.prisma.$queryRaw<EntitlementRow[]>`
      SELECT
        globalTenantId,
        plan,
        status,
        enabledChannels,
        tokenPack,
        tokensIncluded,
        tokensUsed,
        extraTokens,
        currentPeriodStart,
        renewsAt
      FROM LabsEntitlement
      WHERE globalTenantId = ${assistant.globalTenantId}
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

  async findContextByProviderAccountId(
    channelType: LabsChannel,
    providerAccountId: string,
  ): Promise<ChannelWebhookContext | null> {
    const rows = await this.prisma.$queryRaw<ProviderChannelRow[]>`
      SELECT
        c.id,
        c.provider,
        c.status,
        c.config,
        a.id AS assistantId,
        a.globalTenantId,
        a.tenantSlug
      FROM Channel c
      JOIN Assistant a ON a.id = c.assistantId
      WHERE c.type = ${enumValue(channelType)}
        AND c.provider = 'META_OFFICIAL'
        AND (
          c.providerAccountId = ${providerAccountId}
          OR JSON_UNQUOTE(JSON_EXTRACT(c.config, '$.parentId')) = ${providerAccountId}
        )
      ORDER BY c.updatedAt DESC
      LIMIT 1
    `;
    const row = rows[0];
    if (!row?.tenantSlug) return null;

    const entitlements = await this.prisma.$queryRaw<EntitlementRow[]>`
      SELECT
        globalTenantId, plan, status, enabledChannels, tokenPack,
        tokensIncluded, tokensUsed, extraTokens, currentPeriodStart, renewsAt
      FROM LabsEntitlement
      WHERE globalTenantId = ${row.globalTenantId}
      LIMIT 1
    `;

    return {
      assistantId: row.assistantId,
      globalTenantId: row.globalTenantId,
      tenantSlug: row.tenantSlug,
      channelType,
      channel: {
        id: row.id,
        provider: row.provider,
        status: row.status,
        config: normalizeRecord(row.config),
      },
      entitlement: buildRuntimeEntitlement(entitlements[0]),
    };
  }

  async findManualSubscriptionContext(tenantSlug: string, channelType: LabsChannel): Promise<ChannelWebhookContext | null> {
    const context = await this.findContextByTenantSlug(tenantSlug, channelType);
    if (!context) return null;
    const manualId = getManualChannelId(context.assistantId, channelType);
    const channel = await this.prisma.channel.findFirst({
      where: {
        id: manualId,
        assistantId: context.assistantId,
        type: channelType,
        provider: "META_OFFICIAL",
        status: { in: ["PENDING", "CONNECTED"] },
      },
    });
    if (!channel) return null;
    return {
      ...context,
      channel: {
        id: channel.id,
        provider: channel.provider,
        status: channel.status,
        config: normalizeRecord(channel.config),
      },
    };
  }

  async markSubscriptionVerified(context: ChannelWebhookContext): Promise<void> {
    if (!context.channel?.id) return;
    await this.prisma.channel.updateMany({
      where: {
        id: context.channel.id,
        assistantId: context.assistantId,
        type: context.channelType,
        status: "PENDING",
      },
      data: { status: "CONNECTED", lastSyncedAt: new Date(), lastError: null },
    });
  }

  async persistInboundMessage(input: PersistChannelInboundMessageInput): Promise<PersistChannelInboundMessageResult> {
    const now = new Date();
    const channelType = input.message.channelType;
    const existing = await this.prisma.$queryRaw<ConversationRow[]>`
      SELECT id, metadata
      FROM Conversation
      WHERE assistantId = ${input.context.assistantId}
        AND channel = ${enumValue(channelType)}
        AND externalThreadKey = ${input.message.externalThreadKey}
      LIMIT 1
    `;

    let conversation = existing[0];

    if (!conversation) {
      const conversationId = randomUUID();
      await this.prisma.$executeRaw`
        INSERT INTO Conversation (
          id,
          assistantId,
          channel,
          status,
          externalUserId,
          externalThreadKey,
          customerName,
          customerContact,
          metadata,
          messageCount,
          lastMessageAt,
          lastInboundAt,
          createdAt,
          updatedAt
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
      `;
      conversation = {
        id: conversationId,
        metadata: mergeConversationMetadata(null, input),
      };
    }

    const nextMetadata = mergeConversationMetadata(conversation.metadata, input);

    await this.prisma.$executeRaw`
      UPDATE Conversation
      SET
        metadata = ${metadataJson(nextMetadata)},
        customerName = COALESCE(${input.message.customerName ?? null}, customerName),
        customerContact = COALESCE(${input.message.customerContact ?? null}, customerContact),
        messageCount = messageCount + 1,
        lastMessageAt = ${now},
        lastInboundAt = ${now},
        updatedAt = ${now}
      WHERE id = ${conversation.id}
    `;

    const messageId = randomUUID();
    await this.prisma.$executeRaw`
      INSERT INTO Message (
        id,
        conversationId,
        role,
        direction,
        content,
        providerMessageId,
        metadata,
        createdAt
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
    `;

    return {
      conversationId: conversation.id,
      messageId,
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
        INSERT INTO WebhookEvent (
          id,
          channelId,
          providerEventId,
          providerMessageId,
          status,
          metadata,
          createdAt,
          updatedAt
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
      UPDATE WebhookEvent
      SET
        status = 'PROCESSED',
        processedAt = ${new Date()},
        metadata = ${metadataJson({ conversationId: input.conversationId, messageId: input.messageId })},
        updatedAt = ${new Date()}
      WHERE channelId = ${input.context.channel.id}
        AND providerMessageId = ${input.providerMessageId}
    `;
  }

  async markWebhookEventFailed(input: {
    context: ChannelWebhookContext;
    providerMessageId?: string | null;
    reason: string;
  }): Promise<void> {
    if (!input.context.channel?.id || !input.providerMessageId) return;

    await this.prisma.$executeRaw`
      UPDATE WebhookEvent
      SET
        status = 'FAILED',
        failedAt = ${new Date()},
        metadata = ${metadataJson({ reason: input.reason })},
        updatedAt = ${new Date()}
      WHERE channelId = ${input.context.channel.id}
        AND providerMessageId = ${input.providerMessageId}
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
  const context = input.repository.findManualSubscriptionContext
    ? await input.repository.findManualSubscriptionContext(input.tenantSlug, input.channelType)
    : await input.repository.findContextByTenantSlug(input.tenantSlug, input.channelType);
  if (context?.channelType !== input.channelType) return { status: 403, body: "Forbidden" };
  const result = getChannelWebhookVerifyResult({ context, url: input.url });
  if (result.status === 200 && context && input.repository.markSubscriptionVerified) {
    await input.repository.markSubscriptionVerified(context);
  }
  return result;
}

export async function handleMetaChannelWebhook(input: {
  channelType: LabsChannel;
  repository: ChannelWebhookRepository;
  tenantSlug: string;
  rawBody: string;
  signatureHeader: string | null;
  appSecret?: string;
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
  const appSecret = input.appSecret ?? providerConfig.appSecret;

  if (!appSecret || !verifyMetaSignature(appSecret, input.rawBody, input.signatureHeader)) {
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

export async function handleGlobalMetaChannelWebhook(input: {
  channelType: LabsChannel;
  repository: ChannelWebhookRepository;
  rawBody: string;
  signatureHeader: string | null;
  appSecret: string;
  parseMessage: ParseChannelWebhookMessage;
}): Promise<ChannelWebhookPostResult> {
  if (!verifyMetaSignature(input.appSecret, input.rawBody, input.signatureHeader)) {
    return { status: 401, body: { ok: false, reason: "invalid_signature" } };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(input.rawBody);
  } catch {
    return { status: 200, body: { ok: true, ignored: true, reason: "invalid_json" } };
  }

  const entry = normalizeRecord(payload)?.entry;
  const firstEntry = Array.isArray(entry) ? normalizeRecord(entry[0]) : null;
  const providerAccountId =
    typeof firstEntry?.id === "string" ? firstEntry.id.trim() : "";
  if (!providerAccountId || !input.repository.findContextByProviderAccountId) {
    return { status: 200, body: { ok: true, ignored: true, reason: "provider_account_missing" } };
  }

  const context = await input.repository.findContextByProviderAccountId(
    input.channelType,
    providerAccountId,
  );
  if (!context) {
    return { status: 200, body: { ok: true, ignored: true, reason: "channel_not_configured" } };
  }

  const repository: ChannelWebhookRepository = {
    ...input.repository,
    findContextByTenantSlug: async () => context,
  };
  return handleMetaChannelWebhook({
    channelType: input.channelType,
    repository,
    tenantSlug: context.tenantSlug,
    rawBody: input.rawBody,
    signatureHeader: input.signatureHeader,
    appSecret: input.appSecret,
    parseMessage: input.parseMessage,
  });
}
