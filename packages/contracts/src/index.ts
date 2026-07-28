import { z } from "zod";

export * from "./labs-orders";
export * from "./rest";
export * from "./rest-support";
export * from "./rest-promotions";

export const vaseServiceKeySchema = z.enum([
  "vase-portal",
  "vase-app",
  "vase-admin",
  "vase-help",
  "vase-business",
  "vase-management",
  "vase-labs",
  "vase-rest",
  "vase-workplace",
]);

export const vaseProductKeySchema = z.enum([
  "platform",
  "business",
  "management",
  "labs",
  "rest",
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

export const labsChannelLimitsSchema = z.object({
  WHATSAPP: z.number().int().nonnegative(),
  INSTAGRAM: z.number().int().nonnegative(),
  FACEBOOK: z.number().int().nonnegative(),
});

export const managementIntegrationProviderSchema = z.enum(["EXTERNAL_API", "VASE_MANAGEMENT"]);

export const managementPricePublicationSchema = z.object({
  version: z.number().int().positive(),
  currency: z.string().length(3),
  setupPrice: z.number().nonnegative(),
  monthlyPrice: z.number().nonnegative(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  publishedAt: z.iso.datetime().nullable().optional(),
});

export const managementSsoClaimsSchema = z.object({
  nonce: z.string().min(8),
  globalTenantId: z.string().min(1),
  tenantName: z.string().min(1),
  globalUserId: z.string().min(1),
  email: z.email(),
  name: z.string().min(1),
  role: z.enum(["OWNER", "MANAGER", "MEMBER"]),
  issuedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().positive(),
}).refine((claims) => claims.expiresAt > claims.issuedAt && claims.expiresAt - claims.issuedAt <= 300, {
  message: "SSO ticket must expire within five minutes",
  path: ["expiresAt"],
});

export const managementSyncEventSchema = z.object({
  eventId: z.string().min(1),
  globalTenantId: z.string().min(1),
  entity: z.enum(["PRODUCT", "CATEGORY", "PRICE", "STOCK", "CUSTOMER", "ORDER"]),
  action: z.enum(["UPSERT", "ARCHIVE"]),
  externalId: z.string().min(1),
  version: z.number().int().positive(),
  occurredAt: z.iso.datetime(),
  payload: z.record(z.string(), z.unknown()),
});

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

export const metaConnectionAttemptStatusSchema = z.enum([
  "AUTHORIZING",
  "SELECTING_ASSET",
  "VERIFYING",
  "CONNECTED",
  "FAILED",
]);

export const metaAssetCandidateSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["WHATSAPP_PHONE", "INSTAGRAM_ACCOUNT", "FACEBOOK_PAGE"]),
  name: z.string().min(1),
  handle: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
});

export const metaConnectionAttemptSchema = z.object({
  id: z.string().min(1),
  channelType: labsChannelSchema,
  status: metaConnectionAttemptStatusSchema,
  expiresAt: z.iso.datetime(),
  candidates: z.array(metaAssetCandidateSchema),
  errorCode: z.string().nullable(),
});

export const redactedChannelSummarySchema = z.object({
  id: z.string().min(1),
  type: labsChannelSchema,
  provider: z.literal("META_OFFICIAL"),
  status: channelConnectionStatusSchema,
  accountLabel: z.string().nullable(),
  externalHandle: z.string().nullable(),
  providerAccountId: z.string().nullable(),
  connectedAt: z.iso.datetime().nullable(),
  lastSyncedAt: z.iso.datetime().nullable(),
  lastError: z.string().nullable(),
  secretStatus: z.enum(["CONFIGURED", "MISSING"]),
  webhookVerified: z.boolean(),
  credentialsPresent: z.boolean(),
  assetVerified: z.boolean(),
  subscriptionActive: z.boolean(),
});

export const labsSessionContextSchema = z.object({
  globalUserId: z.string().min(1),
  globalTenantId: z.string().min(1),
  tenantSlug: z.string().min(1),
  tenantName: z.string().min(1),
  role: z.enum(["OWNER", "MANAGER", "MEMBER"]),
  entitlement: z.object({
    plan: labsPlanSchema,
    status: z.enum(["ACTIVE", "TRIAL", "PAUSED", "SUSPENDED", "EXPIRED", "CANCELLED"]),
    enabledChannels: z.array(labsChannelSchema),
    channelLimits: labsChannelLimitsSchema.optional(),
  }),
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
  mediaMimeType: z.string().min(1).nullable().optional(),
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
  channelLimits: labsChannelLimitsSchema,
});

export const labsEntitlementOverrideSchema = z.object({
  channelLimits: labsChannelLimitsSchema,
  reason: z.string().trim().min(8),
  updatedBy: z.string().min(1),
  updatedAt: z.iso.datetime(),
});

export const effectiveLabsEntitlementSchema = z.object({
  paidPlan: labsPlanSchema,
  channelLimits: labsChannelLimitsSchema,
  enabledChannels: z.array(labsChannelSchema),
  manualOverride: z.boolean(),
  override: labsEntitlementOverrideSchema.nullable(),
});

export const labsCatalogProductSchema = z.object({
  externalProductId: z.string().min(1),
  sku: z.string().nullable().default(null),
  name: z.string().min(1),
  description: z.string().nullable().default(null),
  price: z.number().nonnegative().nullable().default(null),
  stock: z.number().int(),
  imageUrl: z.string().url().nullable().default(null),
  categories: z.array(z.string().min(1)).default([]),
  active: z.boolean(),
  sourceUpdatedAt: z.iso.datetime(),
});

export const labsCatalogSyncSchema = z.object({
  eventId: z.string().min(1),
  globalTenantId: z.string().min(1),
  occurredAt: z.iso.datetime(),
  products: z.array(labsCatalogProductSchema),
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
  costMicros: z.number().int().nonnegative().optional(),
  model: z.string().min(1).optional(),
  profile: z.string().min(1).optional(),
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
  channelLimits: labsChannelLimitsSchema.optional(),
  planChannelLimits: labsChannelLimitsSchema.optional(),
  overrideReason: z.string().nullable().optional(),
  overrideUpdatedBy: z.string().nullable().optional(),
  overrideUpdatedAt: z.iso.datetime().nullable().optional(),
  syncStatus: z.enum(["SYNCED", "PENDING", "FAILED"]).optional(),
});

export type LabsPlanLimits = z.infer<typeof labsPlanLimitsSchema>;

export const LABS_PLAN_LIMITS = {
  STARTER: {
    plan: "STARTER",
    monthlyTokenLimit: 50000,
    includedChannels: ["WHATSAPP"],
    channelLimits: { WHATSAPP: 1, INSTAGRAM: 0, FACEBOOK: 0 },
  },
  GROWTH: {
    plan: "GROWTH",
    monthlyTokenLimit: 250000,
    includedChannels: ["WHATSAPP", "INSTAGRAM"],
    channelLimits: { WHATSAPP: 1, INSTAGRAM: 1, FACEBOOK: 0 },
  },
  PRO: {
    plan: "PRO",
    monthlyTokenLimit: 1000000,
    includedChannels: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
    channelLimits: { WHATSAPP: 1, INSTAGRAM: 1, FACEBOOK: 1 },
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
  costMicros?: number;
  model?: string;
  profile?: string;
}

export function getLabsPlanLimits(plan: LabsPlan): LabsPlanLimits {
  return labsPlanLimitsSchema.parse(LABS_PLAN_LIMITS[plan]);
}

export function getEffectiveLabsEntitlement(input: {
  paidPlan: LabsPlan;
  override?: LabsEntitlementOverride | null;
}): EffectiveLabsEntitlement {
  const limits = getLabsPlanLimits(input.paidPlan);
  const override = input.override ? labsEntitlementOverrideSchema.parse(input.override) : null;
  const channelLimits = override?.channelLimits ?? limits.channelLimits;
  const enabledChannels = labsChannelSchema.options.filter((channel) => channelLimits[channel] > 0);

  return effectiveLabsEntitlementSchema.parse({
    paidPlan: input.paidPlan,
    channelLimits,
    enabledChannels,
    manualOverride: Boolean(override),
    override,
  });
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
export type ManagementIntegrationProvider = z.infer<typeof managementIntegrationProviderSchema>;
export type ManagementPricePublication = z.infer<typeof managementPricePublicationSchema>;
export type ManagementSsoClaims = z.infer<typeof managementSsoClaimsSchema>;
export type ManagementSyncEvent = z.infer<typeof managementSyncEventSchema>;
export type AiHandoffRequest = z.infer<typeof aiHandoffRequestSchema>;
export type LabsPlan = z.infer<typeof labsPlanSchema>;
export type LabsChannel = z.infer<typeof labsChannelSchema>;
export type LabsChannelLimits = z.infer<typeof labsChannelLimitsSchema>;
export type LabsEntitlementOverride = z.infer<typeof labsEntitlementOverrideSchema>;
export type EffectiveLabsEntitlement = z.infer<typeof effectiveLabsEntitlementSchema>;
export type LabsCatalogProduct = z.infer<typeof labsCatalogProductSchema>;
export type LabsCatalogSync = z.infer<typeof labsCatalogSyncSchema>;
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
export type MetaConnectionAttemptStatus = z.infer<typeof metaConnectionAttemptStatusSchema>;
export type MetaAssetCandidate = z.infer<typeof metaAssetCandidateSchema>;
export type MetaConnectionAttempt = z.infer<typeof metaConnectionAttemptSchema>;
export type RedactedChannelSummary = z.infer<typeof redactedChannelSummarySchema>;
export type LabsSessionContext = z.infer<typeof labsSessionContextSchema>;
export type ChannelConnectionSummary = z.infer<typeof channelConnectionSummarySchema>;
export type InboxConversation = z.infer<typeof inboxConversationSchema>;
export type InboxMessage = z.infer<typeof inboxMessageSchema>;
export type HandoffRequest = z.infer<typeof handoffRequestSchema>;
export type HandoffAssignment = z.infer<typeof handoffAssignmentSchema>;
export type KnowledgeItemDto = z.infer<typeof knowledgeItemDtoSchema>;
export type LabsAnalyticsSummary = z.infer<typeof labsAnalyticsSummarySchema>;
