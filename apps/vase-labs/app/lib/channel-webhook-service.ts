import { Prisma, type PrismaClient } from "./db";
import { randomUUID } from "node:crypto";
import type { InboundChannelMessage, LabsChannel, LabsChannelProvider } from "@vase/contracts";
import { canTenantUseChannel, createRuntimeEntitlement, type LabsRuntimeEntitlement } from "./billing";
import { resolveMetaWebhookVerifyToken } from "./meta-webhook";
import { getManualChannelId } from "./channel-manual-setup";
import { verifyMetaSignature } from "./meta-signature";
import { resolveChannelConnectionStatus } from "./channel-health";
import { createConversationAnalysisQueue } from "./conversation-analysis-queue";
import { PrismaConversationAnalysisRepository } from "./conversation-analysis-repository";

export type ChannelWebhookContext = {
  assistantId: string;
  assistantModel?: string | null;
  assistantSystemPrompt?: string | null;
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
  messageCreatedAt: Date;
  aiBlockedReason: string | null;
  handoffActive?: boolean;
};

export interface ChannelWebhookRepository {
  findContextByTenantSlug(tenantSlug: string, channelType: LabsChannel): Promise<ChannelWebhookContext | null>;
  findManualSubscriptionContext?(tenantSlug: string, channelType: LabsChannel): Promise<ChannelWebhookContext | null>;
  markWebhookVerified?(context: ChannelWebhookContext): Promise<void>;
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
  markAiReplyFailed?(input: {
    context: ChannelWebhookContext;
    conversationId: string;
    messageId: string;
    reason: string;
  }): Promise<void>;
  requestHumanHandoff?(input: {
    context: ChannelWebhookContext;
    conversationId: string;
    messageId: string;
    reason: string;
    source: "customer_intent" | "manual";
  }): Promise<void>;
  enqueueConversationAnalysis(input: {
    conversationId: string;
    messageId: string;
    messageCreatedAt: Date;
  }): Promise<void>;
  enqueueAudioTranscription?(input: {
    context: ChannelWebhookContext;
    conversationId: string;
    messageId: string;
    providerMediaId: string;
    mimeType: string | null;
  }): Promise<void>;
  markConversationAnalysisEnqueued?(input: {
    context: ChannelWebhookContext;
    conversationId: string;
    messageId: string;
  }): Promise<void>;
  markConversationAnalysisEnqueueFailed?(input: {
    context: ChannelWebhookContext;
    conversationId: string;
    messageId: string;
    reason: "CONVERSATION_ANALYSIS_ENQUEUE_FAILED";
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
    aiReplyError?: string | null;
    humanHandoffRequested?: boolean;
  };
};

export type ParseChannelWebhookMessage = (input: {
  globalTenantId: string;
  payload: unknown;
}) => InboundChannelMessage | null;

export type RunChannelAiReply = (input: {
  context: ChannelWebhookContext;
  message: InboundChannelMessage;
  persisted: PersistChannelInboundMessageResult;
}) => Promise<{ ok: boolean; messageId?: string; totalTokens?: number; reason?: string }>;

type AssistantRow = {
  id: string;
  model?: string | null;
  systemPrompt?: string | null;
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
  model?: string | null;
  systemPrompt?: string | null;
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

type ConversationRow = {
  id: string;
  metadata: unknown;
  escalatedToHuman?: boolean | null;
  status?: string | null;
};

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

export function detectHumanHandoffIntent(text: string | null | undefined) {
  const normalized = text
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (!normalized) return false;

  return [
    /\bhablar\s+con\s+(un|una)?\s*(humano|persona|asesor|operador|representante)\b/,
    /\bquiero\s+(un|una)?\s*(humano|persona|asesor|operador|representante)\b/,
    /\bme\s+atiende\s+(un|una)?\s*(humano|persona|asesor|operador|representante)\b/,
    /\batencion\s+humana\b/,
    /\bsoporte\s+humano\b/,
    /\bnecesito\s+(ayuda\s+)?(humana|de\s+una\s+persona|un\s+asesor)\b/,
    /\btalk\s+to\s+(a\s+)?(human|agent|representative|person)\b/,
    /\bspeak\s+to\s+(a\s+)?(human|agent|representative|person)\b/,
    /\bhuman\s+(agent|support)\b/,
  ].some((phrase) => phrase.test(normalized));
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
      SELECT id, globalTenantId, tenantSlug, model, systemPrompt
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
      assistantModel: assistant.model ?? null,
      assistantSystemPrompt: assistant.systemPrompt ?? null,
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
        a.model,
        a.systemPrompt,
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
      assistantModel: row.model ?? null,
      assistantSystemPrompt: row.systemPrompt ?? null,
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
        status: { in: ["PENDING", "CONNECTED", "ERROR"] },
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

  async markWebhookVerified(context: ChannelWebhookContext): Promise<void> {
    if (!context.channel?.id) return;
    await this.prisma.$transaction(async (tx) => {
      const channel = await tx.channel.findFirst({
        where: { id: context.channel!.id, assistantId: context.assistantId, type: context.channelType },
        include: { secrets: { where: { kind: { in: ["META_ACCESS_TOKEN", "META_APP_SECRET"] } }, select: { kind: true } } },
      });
      if (!channel) return;
      const config = normalizeRecord(channel.config) ?? {};
      const now = new Date();
      const status = resolveChannelConnectionStatus({
        webhookVerified: true,
        credentialsPresent: channel.secrets.some((item) => item.kind === "META_ACCESS_TOKEN") && (channel.secrets.some((item) => item.kind === "META_APP_SECRET") || Boolean(process.env.META_APP_SECRET?.trim())),
        assetVerified: Boolean(channel.providerAccountId),
        subscriptionActive: Array.isArray(config.subscribedFields) && config.subscribedFields.length > 0,
      });
      await tx.channel.update({
        where: { id: channel.id },
        data: { webhookVerifiedAt: now, status, connectedAt: status === "CONNECTED" ? now : null, lastSyncedAt: now, lastError: null },
      });
    });
  }

  async persistInboundMessage(input: PersistChannelInboundMessageInput): Promise<PersistChannelInboundMessageResult> {
    const now = new Date();
    const channelType = input.message.channelType;
    const existing = await this.prisma.$queryRaw<ConversationRow[]>`
      SELECT id, metadata, escalatedToHuman, status
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
        escalatedToHuman: false,
        status: "OPEN",
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
        analysisPendingAt,
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
        ${now},
        ${now}
      )
    `;

    return {
      conversationId: conversation.id,
      messageId,
      messageCreatedAt: now,
      aiBlockedReason: input.aiBlockedReason,
      handoffActive: Boolean(conversation.escalatedToHuman) || conversation.status === "ESCALATED",
    };
  }

  async enqueueConversationAnalysis(input: {
    conversationId: string;
    messageId: string;
    messageCreatedAt: Date;
  }): Promise<void> {
    const queue = createConversationAnalysisQueue({
      repository: new PrismaConversationAnalysisRepository(this.prisma),
      clock: () => new Date(),
      tokenFactory: randomUUID,
      maxAttempts: 3,
      leaseDurationMs: 60_000,
    });
    await queue.enqueue({
      conversationId: input.conversationId,
      requestedThroughMessageId: input.messageId,
      requestedThroughMessageCreatedAt: input.messageCreatedAt,
    });
  }

  async enqueueAudioTranscription(input: {
    context: ChannelWebhookContext;
    conversationId: string;
    messageId: string;
    providerMediaId: string;
    mimeType: string | null;
  }): Promise<void> {
    await this.prisma.audioTranscriptionJob.upsert({
      where: {
        assistantId_providerMediaId: {
          assistantId: input.context.assistantId,
          providerMediaId: input.providerMediaId,
        },
      },
      create: {
        conversationId: input.conversationId,
        messageId: input.messageId,
        globalTenantId: input.context.globalTenantId,
        assistantId: input.context.assistantId,
        channel: input.context.channelType,
        providerMediaId: input.providerMediaId,
        mimeType: input.mimeType,
      },
      update: {},
    });
  }

  async markConversationAnalysisEnqueueFailed(input: {
    context: ChannelWebhookContext;
    conversationId: string;
    messageId: string;
    reason: "CONVERSATION_ANALYSIS_ENQUEUE_FAILED";
  }): Promise<void> {
    const rows = await this.prisma.$queryRaw<ConversationRow[]>`
      SELECT id, metadata
      FROM Conversation
      WHERE id = ${input.conversationId}
        AND assistantId = ${input.context.assistantId}
      LIMIT 1
    `;
    const conversation = rows[0];
    if (!conversation) return;
    const metadata = normalizeRecord(conversation.metadata) ?? {};
    const context = normalizeRecord(metadata.context) ?? {};
    await this.prisma.$executeRaw`
      UPDATE Conversation
      SET
        metadata = ${metadataJson({
          ...metadata,
          context: {
            ...context,
            conversationAnalysisEnqueueError: input.reason,
            conversationAnalysisEnqueueFailedMessageId: input.messageId,
          },
        })},
        updatedAt = ${new Date()}
      WHERE id = ${input.conversationId}
        AND assistantId = ${input.context.assistantId}
    `;
  }

  async markConversationAnalysisEnqueued(input: {
    context: ChannelWebhookContext;
    conversationId: string;
    messageId: string;
  }): Promise<void> {
    await new PrismaConversationAnalysisRepository(this.prisma)
      .clearFailedEnqueueMarker({
        conversationId: input.conversationId,
        assistantId: input.context.assistantId,
        messageId: input.messageId,
      });
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

  async markAiReplyFailed(input: {
    context: ChannelWebhookContext;
    conversationId: string;
    messageId: string;
    reason: string;
  }): Promise<void> {
    const rows = await this.prisma.$queryRaw<ConversationRow[]>`
      SELECT id, metadata
      FROM Conversation
      WHERE id = ${input.conversationId}
        AND assistantId = ${input.context.assistantId}
      LIMIT 1
    `;
    const conversation = rows[0];
    if (!conversation) return;

    const current = normalizeRecord(conversation.metadata) ?? {};
    const context = normalizeRecord(current.context) ?? {};
    await this.prisma.$executeRaw`
      UPDATE Conversation
      SET
        metadata = ${metadataJson({
          ...current,
          state: "AI_FAILED",
          context: {
            ...context,
            aiReplyError: input.reason,
            aiReplyFailedAt: new Date().toISOString(),
            aiReplyFailedMessageId: input.messageId,
          },
        })},
        updatedAt = ${new Date()}
      WHERE id = ${input.conversationId}
        AND assistantId = ${input.context.assistantId}
    `;
  }

  async requestHumanHandoff(input: {
    context: ChannelWebhookContext;
    conversationId: string;
    messageId: string;
    reason: string;
    source: "customer_intent" | "manual";
  }): Promise<void> {
    const now = new Date();
    const activeHandoffs = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT h.id
      FROM Handoff h
      JOIN Conversation c ON c.id = h.conversationId
      WHERE h.conversationId = ${input.conversationId}
        AND c.assistantId = ${input.context.assistantId}
        AND h.status IN ('PENDING', 'ASSIGNED')
      LIMIT 1
    `;

    await this.prisma.$executeRaw`
      UPDATE Conversation
      SET
        status = 'ESCALATED',
        escalatedToHuman = true,
        updatedAt = ${now}
      WHERE id = ${input.conversationId}
        AND assistantId = ${input.context.assistantId}
    `;

    if (activeHandoffs[0]) return;

    await this.prisma.$executeRaw`
      INSERT INTO Handoff (
        id,
        conversationId,
        reason,
        target,
        status,
        priority,
        notes,
        createdAt
      )
      VALUES (
        ${randomUUID()},
        ${input.conversationId},
        ${input.reason},
        'labs',
        'PENDING',
        'high',
        ${JSON.stringify({ source: input.source, messageId: input.messageId })},
        ${now}
      )
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
  if (result.status === 200 && context && input.repository.markWebhookVerified) {
    await input.repository.markWebhookVerified(context);
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
  runAiReply?: RunChannelAiReply;
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

  const humanHandoffRequested = detectHumanHandoffIntent(message.text);
  const aiBlockedReason = humanHandoffRequested
    ? "HANDOFF_REQUESTED"
    : resolveAiBlockedReason(context.entitlement, input.channelType);
  let aiReplyError: string | null = null;
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
    if (humanHandoffRequested) {
      await input.repository.requestHumanHandoff?.({
        context,
        conversationId: persisted.conversationId,
        messageId: persisted.messageId,
        reason: "El cliente pidio hablar con un humano.",
        source: "customer_intent",
      });
      persisted = { ...persisted, handoffActive: true };
    }
    const audioQueued =
      message.messageType === "audio"
      && Boolean(message.mediaId)
      && !aiBlockedReason
      && !persisted.handoffActive
      && Boolean(input.repository.enqueueAudioTranscription);
    if (audioQueued) {
      try {
        await input.repository.enqueueAudioTranscription?.({
          context,
          conversationId: persisted.conversationId,
          messageId: persisted.messageId,
          providerMediaId: message.mediaId!,
          mimeType: message.mediaMimeType ?? null,
        });
      } catch {
        aiReplyError = "AUDIO_TRANSCRIPTION_ENQUEUE_FAILED";
        await input.repository.markAiReplyFailed?.({
          context,
          conversationId: persisted.conversationId,
          messageId: persisted.messageId,
          reason: aiReplyError,
        });
      }
    } else {
      try {
        await input.repository.enqueueConversationAnalysis({
          conversationId: persisted.conversationId,
          messageId: persisted.messageId,
          messageCreatedAt: persisted.messageCreatedAt,
        });
        try {
          await input.repository.markConversationAnalysisEnqueued?.({
            context,
            conversationId: persisted.conversationId,
            messageId: persisted.messageId,
          });
        } catch {
          // The durable message marker lets the worker sweep finish cleanup.
        }
      } catch {
        try {
          await input.repository.markConversationAnalysisEnqueueFailed?.({
            context,
            conversationId: persisted.conversationId,
            messageId: persisted.messageId,
            reason: "CONVERSATION_ANALYSIS_ENQUEUE_FAILED",
          });
        } catch {
          // The inbound is durable; keep Meta acknowledgement stable.
        }
      }
    }
    if (!audioQueued && !aiBlockedReason && !persisted.handoffActive && input.runAiReply) {
      try {
        await input.runAiReply({ context, message, persisted });
      } catch (error) {
        aiReplyError = error instanceof Error ? error.message : "AI_REPLY_FAILED";
        await input.repository.markAiReplyFailed?.({
          context,
          conversationId: persisted.conversationId,
          messageId: persisted.messageId,
          reason: aiReplyError,
        });
        // Keep webhook acknowledgement stable after the inbound message is persisted.
      }
    }
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
      aiReplyError,
      humanHandoffRequested,
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
  runAiReply?: RunChannelAiReply;
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
    runAiReply: input.runAiReply,
  });
}
