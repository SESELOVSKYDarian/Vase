// Parte de channel-webhook-service.ts: ChannelWebhookContext, PersistChannelInboundMessageInput, PersistChannelInboundMessageResult, ChannelWebhookRepository, ChannelWebhookVerifyResult, ChannelWebhookPostResult y más.
import { Prisma } from "../db";
import { type TrainerProposal } from "../knowledge-trainer";
import { type InboundChannelMessage, type LabsChannel, type LabsChannelProvider } from "@vase/contracts";
import { canTenantUseChannel, type LabsRuntimeEntitlement } from "../billing";

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
  findTrainerPhone?(globalTenantId: string, phone: string): Promise<{ id: string } | null>;
  persistTrainerInstruction?(input: { context: ChannelWebhookContext; trainerPhoneId: string; message: InboundChannelMessage; preparedProposal?: TrainerProposal }): Promise<{ proposalId: string; replyText: string }>;
  sendTrainerReply?(input: { context: ChannelWebhookContext; trainerPhoneId: string; text: string }): Promise<void>;
  enqueueTrainerAudio?(input: { context: ChannelWebhookContext; trainerPhoneId: string; message: InboundChannelMessage }): Promise<void>;
  findContextByTenantSlug(tenantSlug: string, channelType: LabsChannel): Promise<ChannelWebhookContext | null>;
  findManualSubscriptionContext?(tenantSlug: string, channelType: LabsChannel): Promise<ChannelWebhookContext | null>;
  markWebhookVerified?(context: ChannelWebhookContext): Promise<void>;
  markWebhookAttempt?(input: {
    context: ChannelWebhookContext;
    status: "RECEIVED" | "IGNORED" | "PROCESSED" | "FAILED";
    reason?: string | null;
  }): Promise<void>;
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

export type ResolveInboundCustomerName = (input: {
  context: ChannelWebhookContext;
  message: InboundChannelMessage;
}) => Promise<string | null>;

export type AssistantRow = {
  id: string;
  model?: string | null;
  systemPrompt?: string | null;
  globalTenantId: string;
  tenantSlug: string | null;
};

export type ChannelRow = {
  id: string;
  provider: LabsChannelProvider | null;
  status: string;
  config: unknown;
};

export type ProviderChannelRow = ChannelRow & {
  assistantId: string;
  model?: string | null;
  systemPrompt?: string | null;
  globalTenantId: string;
  tenantSlug: string | null;
};

export type EntitlementRow = {
  globalTenantId: string;
  plan: LabsRuntimeEntitlement["plan"];
  status: LabsRuntimeEntitlement["status"];
  enabledChannels: LabsChannel[];
  tokenPack: LabsRuntimeEntitlement["tokenPack"];
  tokensIncluded: number;
  tokensUsed: number;
  extraTokens: number;
  aiBudgetMicros?: number | null;
  aiBudgetUsedMicros?: number | null;
  extraAiBudgetMicros?: number | null;
  currentPeriodStart: Date | null;
  renewsAt: Date | null;
};

export type ConversationRow = {
  id: string;
  metadata: unknown;
  escalatedToHuman?: boolean | null;
  status?: string | null;
};

export const allowedChannels: LabsChannel[] = ["WHATSAPP", "INSTAGRAM", "FACEBOOK"];

export function normalizeRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function normalizeEnabledChannels(value: unknown): LabsChannel[] {
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

export function metadataJson(value: Record<string, unknown>) {
  return Prisma.sql`${JSON.stringify(value)}`;
}

export function enumValue(channelType: LabsChannel) {
  return Prisma.sql`${channelType}`;
}

export function messageContent(message: InboundChannelMessage) {
  const text = message.text?.trim();
  if (text) return text;
  return `[${message.messageType}]`;
}

export function readMetaChannelProviderConfig(config: unknown) {
  const source = normalizeRecord(config) ?? {};
  return {
    appSecret: typeof source.appSecret === "string" ? source.appSecret : undefined,
    verifyToken: typeof source.verifyToken === "string" ? source.verifyToken : undefined,
  };
}

export function canProcessChannelWebhook(context: ChannelWebhookContext) {
  return context.channel?.status !== "DISCONNECTED";
}

export function resolveAiBlockedReason(entitlement: LabsRuntimeEntitlement | null, channelType: LabsChannel) {
  if (!entitlement) return "ENTITLEMENT_NOT_FOUND";

  const access = canTenantUseChannel(entitlement, channelType);
  if (access.allowed) return null;

  return access.reason === "CHANNEL_NOT_INCLUDED" ? "CHANNEL_NOT_ENTITLED" : access.reason;
}
