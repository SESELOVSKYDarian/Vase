import { z } from "zod";

export const vaseServiceKeySchema = z.enum([
  "vase-portal",
  "vase-app",
  "vase-admin",
  "vase-help",
  "vase-business",
  "vase-management",
  "vase-labs",
  "vase-workplace",
]);

export const vaseProductKeySchema = z.enum([
  "platform",
  "business",
  "management",
  "labs",
  "workplace",
  "help",
]);

export const lifecycleStatusSchema = z.enum([
  "ACTIVE",
  "TRIAL",
  "SUSPENDED",
  "EXPIRED",
  "CANCELLED",
]);

export const serviceHealthSchema = z.object({
  service: vaseServiceKeySchema,
  domain: z.string().min(1),
  status: z.enum(["ok", "degraded"]),
  timestamp: z.iso.datetime(),
});

export const entitlementSchema = z.object({
  globalTenantId: z.string().min(1),
  productKey: vaseProductKeySchema,
  status: lifecycleStatusSchema,
});

export const aiHandoffRequestSchema = z.object({
  tenantGlobalId: z.string().min(1),
  productKey: vaseProductKeySchema,
  conversationId: z.string().min(1),
  reason: z.string().min(3),
});

export const labsPlanSchema = z.enum(["STARTER", "GROWTH", "PRO"]);

export const labsChannelSchema = z.enum(["WHATSAPP", "INSTAGRAM", "FACEBOOK"]);

export const tokenPackSchema = z.enum(["BASIC", "MEDIUM", "PRO"]);

export const labsChannelProviderSchema = z.enum(["META_OFFICIAL", "OPENWA_UNOFFICIAL", "BAILEYS_UNOFFICIAL"]);

export const channelConnectionStatusSchema = z.enum([
  "DISCONNECTED",
  "PENDING",
  "CONNECTED",
  "ERROR",
  "QR_READY",
]);

export const channelMessageTypeSchema = z.enum(["text", "audio", "image", "document", "interactive", "unknown"]);

export const channelMessageDirectionSchema = z.enum(["INBOUND", "OUTBOUND"]);

export const webhookEventStatusSchema = z.enum(["PROCESSING", "PROCESSED", "FAILED"]);
export const messageDeliveryStatusSchema = z.enum(["PENDING", "SENT", "FAILED"]);
export const handoffStatusSchema = z.enum(["PENDING", "ASSIGNED", "RESOLVED", "CANCELLED"]);

export const outboundChannelMessageSchema = z.object({
  to: z.string().min(1),
  text: z.string().min(1),
});

export const metaConnectStartSchema = z.object({
  tenantSlug: z.string().min(1),
  channelType: labsChannelSchema,
});

export const metaConnectStartResultSchema = z.object({
  authorizationUrl: z.string().url(),
  state: z.string().min(1),
  expiresAt: z.iso.datetime(),
  scopes: z.array(z.string().min(1)),
});

export const channelConnectionSummarySchema = z.object({
  id: z.string().min(1),
  type: labsChannelSchema,
  provider: labsChannelProviderSchema.nullable(),
  status: channelConnectionStatusSchema,
  accountLabel: z.string().nullable(),
  externalHandle: z.string().nullable(),
  connectedAt: z.iso.datetime().nullable(),
  lastSyncedAt: z.iso.datetime().nullable(),
  lastError: z.string().nullable(),
});

export const inboundChannelMessageSchema = z.object({
  globalTenantId: z.string().min(1),
  channelType: labsChannelSchema,
  externalThreadKey: z.string().min(1),
  externalMessageId: z.string().min(1).nullable().optional(),
  customerName: z.string().min(1).nullable().optional(),
  customerContact: z.string().min(1).nullable().optional(),
  text: z.string().nullable().optional(),
  messageType: channelMessageTypeSchema,
  mediaId: z.string().min(1).nullable().optional(),
  provider: labsChannelProviderSchema.optional(),
  rawPayload: z.unknown().optional(),
});

export const whatsappProviderConfigSchema = z.object({
  provider: labsChannelProviderSchema,
  accessToken: z.string().min(1).optional(),
  phoneNumberId: z.string().min(1).optional(),
  wabaId: z.string().min(1).optional(),
  appSecret: z.string().min(1).optional(),
  verifyToken: z.string().min(1).optional(),
  openwaBaseUrl: z.string().min(1).optional(),
  openwaApiKey: z.string().min(1).optional(),
  qrImageDataUrl: z.string().min(1).optional(),
  qrLastFetchedAt: z.iso.datetime().optional(),
  connectionState: channelConnectionStatusSchema.optional(),
  failureReason: z.string().min(1).optional(),
});

export const labsPlanLimitsSchema = z.object({
  plan: labsPlanSchema,
  monthlyTokenLimit: z.number().int().positive(),
  includedChannels: z.array(labsChannelSchema).min(1),
});

export const labsEntitlementSchema = z.object({
  globalTenantId: z.string().min(1),
  plan: labsPlanSchema,
  status: lifecycleStatusSchema,
  enabledChannels: z.array(labsChannelSchema).min(1),
  monthlyTokenLimit: z.number().int().nonnegative(),
  monthlyTokenUsed: z.number().int().nonnegative(),
  tokenPackBalance: z.number().int().nonnegative(),
});

export const tokenUsageSchema = z.object({
  globalTenantId: z.string().min(1),
  channel: labsChannelSchema,
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  conversationId: z.string().min(1).optional(),
  messageId: z.string().min(1).optional(),
  assistantId: z.string().min(1).optional(),
  occurredAt: z.iso.datetime(),
});

export const inboxMessageSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  role: z.string().min(1),
  direction: channelMessageDirectionSchema.nullable(),
  content: z.string(),
  providerMessageId: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export const inboxConversationSchema = z.object({
  id: z.string().min(1),
  globalTenantId: z.string().min(1),
  channel: labsChannelSchema.nullable(),
  status: z.enum(["OPEN", "ESCALATED", "CLOSED"]),
  customerName: z.string().nullable(),
  customerContact: z.string().nullable().optional(),
  lastMessageAt: z.iso.datetime().nullable(),
  messageCount: z.number().int().nonnegative(),
  escalatedToHuman: z.boolean(),
});

export const handoffRequestSchema = z.object({
  conversationId: z.string().min(1),
  reason: z.string().min(3),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
});

export const handoffAssignmentSchema = z.object({
  handoffId: z.string().min(1),
  assignedTo: z.string().min(1),
});

export const knowledgeItemDtoSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sourceType: z.string().min(1),
  content: z.string(),
  status: z.enum(["READY", "TRAINING", "ERROR"]),
});

export const labsAnalyticsSummarySchema = z.object({
  conversationsOpen: z.number().int().nonnegative(),
  conversationsEscalated: z.number().int().nonnegative(),
  inboundMessages: z.number().int().nonnegative(),
  outboundMessages: z.number().int().nonnegative(),
  tokensUsed: z.number().int().nonnegative(),
  costCents: z.number().int().nonnegative(),
  connectedChannels: z.number().int().nonnegative(),
  pendingHandoffs: z.number().int().nonnegative(),
});

export const labsServiceStatusSchema = z.enum(["ACTIVE", "TRIAL", "PAUSED", "SUSPENDED", "EXPIRED", "CANCELLED"]);

export const labsAdminTenantControlSchema = z.object({
  globalTenantId: z.string().min(1),
  companyName: z.string().min(1),
  labsActive: z.boolean(),
  plan: labsPlanSchema,
  enabledChannels: z.array(labsChannelSchema),
  tokenPack: tokenPackSchema.nullable(),
  tokensIncluded: z.number().int().nonnegative(),
  tokensUsed: z.number().int().nonnegative(),
  extraTokens: z.number().int().nonnegative(),
  serviceStatus: labsServiceStatusSchema,
  manualOverride: z.boolean(),
});

export type LabsPlanLimits = z.infer<typeof labsPlanLimitsSchema>;

export const LABS_PLAN_LIMITS = {
  STARTER: {
    plan: "STARTER",
    monthlyTokenLimit: 50000,
    includedChannels: ["WHATSAPP"],
  },
  GROWTH: {
    plan: "GROWTH",
    monthlyTokenLimit: 250000,
    includedChannels: ["WHATSAPP", "INSTAGRAM"],
  },
  PRO: {
    plan: "PRO",
    monthlyTokenLimit: 1000000,
    includedChannels: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
  },
} as const satisfies Record<z.infer<typeof labsPlanSchema>, LabsPlanLimits>;

export const TOKEN_PACK_TOKENS = {
  BASIC: 500000,
  MEDIUM: 1200000,
  PRO: 3000000,
} as const satisfies Record<z.infer<typeof tokenPackSchema>, number>;

export const LABS_AVERAGE_TOKENS_PER_MESSAGE = 500;

export interface CreateLabsEntitlementInput {
  globalTenantId: string;
  plan: LabsPlan;
  status: LifecycleStatus;
  enabledChannels?: LabsChannel[];
  monthlyTokenUsed?: number;
  tokenPackBalance?: number;
}

export interface CreateTokenUsageInput {
  globalTenantId: string;
  channel: LabsChannel;
  inputTokens: number;
  outputTokens: number;
  conversationId?: string;
  messageId?: string;
  assistantId?: string;
  occurredAt?: string;
}

export function getLabsPlanLimits(plan: LabsPlan): LabsPlanLimits {
  return labsPlanLimitsSchema.parse(LABS_PLAN_LIMITS[plan]);
}

export function getTokenPackTokens(pack: TokenPack): number {
  return TOKEN_PACK_TOKENS[pack];
}

export function createLabsEntitlement(input: CreateLabsEntitlementInput): LabsEntitlement {
  const limits = getLabsPlanLimits(input.plan);

  return labsEntitlementSchema.parse({
    globalTenantId: input.globalTenantId,
    plan: input.plan,
    status: input.status,
    enabledChannels: input.enabledChannels ?? limits.includedChannels,
    monthlyTokenLimit: limits.monthlyTokenLimit,
    monthlyTokenUsed: input.monthlyTokenUsed ?? 0,
    tokenPackBalance: input.tokenPackBalance ?? 0,
  });
}

export function canUseLabsChannel(entitlement: LabsEntitlement, channel: LabsChannel): boolean {
  if (entitlement.status !== "ACTIVE" && entitlement.status !== "TRIAL") {
    return false;
  }

  return entitlement.enabledChannels.includes(channel);
}

export function getLabsTokenBalance(entitlement: LabsEntitlement): number {
  return Math.max(0, entitlement.monthlyTokenLimit + entitlement.tokenPackBalance - entitlement.monthlyTokenUsed);
}

export function estimateMessagesFromTokens(tokens: number): number {
  return Math.floor(tokens / LABS_AVERAGE_TOKENS_PER_MESSAGE);
}

export function estimateMessagesFromTokenPack(pack: TokenPack): number {
  return estimateMessagesFromTokens(getTokenPackTokens(pack));
}

export function createTokenUsage(input: CreateTokenUsageInput): TokenUsage {
  return tokenUsageSchema.parse({
    ...input,
    totalTokens: input.inputTokens + input.outputTokens,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
  });
}

export function canUseInboundChannelMessage(entitlement: LabsEntitlement, message: InboundChannelMessage): boolean {
  return canUseLabsChannel(entitlement, message.channelType);
}

export type VaseServiceKey = z.infer<typeof vaseServiceKeySchema>;
export type VaseProductKey = z.infer<typeof vaseProductKeySchema>;
export type LifecycleStatus = z.infer<typeof lifecycleStatusSchema>;
export type ServiceHealth = z.infer<typeof serviceHealthSchema>;
export type Entitlement = z.infer<typeof entitlementSchema>;
export type AiHandoffRequest = z.infer<typeof aiHandoffRequestSchema>;
export type LabsPlan = z.infer<typeof labsPlanSchema>;
export type LabsChannel = z.infer<typeof labsChannelSchema>;
export type TokenPack = z.infer<typeof tokenPackSchema>;
export type LabsChannelProvider = z.infer<typeof labsChannelProviderSchema>;
export type ChannelConnectionStatus = z.infer<typeof channelConnectionStatusSchema>;
export type ChannelMessageType = z.infer<typeof channelMessageTypeSchema>;
export type ChannelMessageDirection = z.infer<typeof channelMessageDirectionSchema>;
export type WebhookEventStatus = z.infer<typeof webhookEventStatusSchema>;
export type MessageDeliveryStatus = z.infer<typeof messageDeliveryStatusSchema>;
export type HandoffStatus = z.infer<typeof handoffStatusSchema>;
export type InboundChannelMessage = z.infer<typeof inboundChannelMessageSchema>;
export type OutboundChannelMessage = z.infer<typeof outboundChannelMessageSchema>;
export type WhatsAppProviderConfig = z.infer<typeof whatsappProviderConfigSchema>;
export type LabsEntitlement = z.infer<typeof labsEntitlementSchema>;
export type TokenUsage = z.infer<typeof tokenUsageSchema>;
export type LabsServiceStatus = z.infer<typeof labsServiceStatusSchema>;
export type LabsAdminTenantControl = z.infer<typeof labsAdminTenantControlSchema>;
export type MetaConnectStart = z.infer<typeof metaConnectStartSchema>;
export type MetaConnectStartResult = z.infer<typeof metaConnectStartResultSchema>;
export type ChannelConnectionSummary = z.infer<typeof channelConnectionSummarySchema>;
export type InboxConversation = z.infer<typeof inboxConversationSchema>;
export type InboxMessage = z.infer<typeof inboxMessageSchema>;
export type HandoffRequest = z.infer<typeof handoffRequestSchema>;
export type HandoffAssignment = z.infer<typeof handoffAssignmentSchema>;
export type KnowledgeItemDto = z.infer<typeof knowledgeItemDtoSchema>;
export type LabsAnalyticsSummary = z.infer<typeof labsAnalyticsSummarySchema>;
