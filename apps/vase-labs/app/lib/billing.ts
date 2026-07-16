import {
  createTokenUsage,
  estimateMessagesFromTokens,
  type LabsChannel,
  type LabsPlan,
  type TokenPack,
  type TokenUsage,
} from "@vase/contracts";

export const FIVE_HOUR_WINDOW_MS = 5 * 60 * 60 * 1000;

export type LabsRuntimeStatus = "ACTIVE" | "TRIAL" | "PAUSED" | "SUSPENDED" | "EXPIRED" | "CANCELLED";

export interface LabsRuntimeEntitlement {
  globalTenantId: string;
  plan: LabsPlan;
  status: LabsRuntimeStatus;
  enabledChannels: LabsChannel[];
  channelLimits?: Record<LabsChannel, number>;
  tokenPack?: TokenPack | null;
  tokensIncluded: number;
  tokensUsed: number;
  extraTokens: number;
  currentPeriodStart?: string | null;
  renewsAt?: string | null;
}

export interface UsageWindowSnapshot {
  windowStartAt: string | null;
  windowEndsAt: string | null;
  windowDurationMs: number;
  windowIndex: number;
  totalWindows: number;
  accruedTokens: number;
  availableWindowTokens: number;
}

export interface ChannelAccessDecision {
  allowed: boolean;
  requiresUpgrade: boolean;
  reason: "OK" | "CHANNEL_NOT_INCLUDED" | "SERVICE_INACTIVE" | "AI_PAUSED_NO_TOKENS" | "AI_PAUSED_MANUAL";
  humanInterventionAllowed: boolean;
}

export interface AiAvailability {
  aiEnabled: boolean;
  humanInterventionAllowed: true;
  reason: "OK" | "SERVICE_INACTIVE" | "AI_PAUSED_NO_TOKENS" | "AI_PAUSED_MANUAL";
  remainingTokens: number;
  remainingMessages: number;
  availableWindowTokens: number;
}

export interface RegisterTokenConsumptionInput {
  channel: LabsChannel;
  inputTokens: number;
  outputTokens: number;
  conversationId?: string;
  messageId?: string;
  assistantId?: string;
  occurredAt?: string;
}

export function createRuntimeEntitlement(input: LabsRuntimeEntitlement): LabsRuntimeEntitlement {
  return {
    ...input,
    channelLimits: input.channelLimits ?? Object.fromEntries(
      (["WHATSAPP", "INSTAGRAM", "FACEBOOK"] as const).map((channel) => [channel, input.enabledChannels.includes(channel) ? 1 : 0]),
    ) as Record<LabsChannel, number>,
    tokenPack: input.tokenPack ?? null,
    currentPeriodStart: input.currentPeriodStart ?? null,
    renewsAt: input.renewsAt ?? null,
  };
}

export function calculateUsedTokens(usages: Array<Pick<TokenUsage, "totalTokens">>): number {
  return usages.reduce((total, usage) => total + usage.totalTokens, 0);
}

export function calculateRemainingTokens(entitlement: LabsRuntimeEntitlement): number {
  return Math.max(0, entitlement.tokensIncluded + entitlement.extraTokens - entitlement.tokensUsed);
}

export function calculateRemainingMessages(entitlement: LabsRuntimeEntitlement): number {
  return estimateMessagesFromTokens(calculateRemainingTokens(entitlement));
}

export function getUsageWindowSnapshot(
  entitlement: LabsRuntimeEntitlement,
  now: Date = new Date(),
): UsageWindowSnapshot {
  if (!entitlement.currentPeriodStart || !entitlement.renewsAt) {
    return {
      windowStartAt: null,
      windowEndsAt: null,
      windowDurationMs: FIVE_HOUR_WINDOW_MS,
      windowIndex: 0,
      totalWindows: 1,
      accruedTokens: entitlement.tokensIncluded + entitlement.extraTokens,
      availableWindowTokens: calculateRemainingTokens(entitlement),
    };
  }

  const periodStartMs = new Date(entitlement.currentPeriodStart).getTime();
  const renewsAtMs = new Date(entitlement.renewsAt).getTime();
  const nowMs = now.getTime();
  const totalPeriodMs = Math.max(FIVE_HOUR_WINDOW_MS, renewsAtMs - periodStartMs);
  const totalWindows = Math.max(1, Math.ceil(totalPeriodMs / FIVE_HOUR_WINDOW_MS));
  const elapsedWindowIndex = Math.max(0, Math.floor((nowMs - periodStartMs) / FIVE_HOUR_WINDOW_MS));
  const windowIndex = Math.min(elapsedWindowIndex, totalWindows - 1);
  const windowStartMs = periodStartMs + windowIndex * FIVE_HOUR_WINDOW_MS;
  const windowEndsAtMs = Math.min(windowStartMs + FIVE_HOUR_WINDOW_MS, renewsAtMs);
  const accruedWindows = Math.min(totalWindows, windowIndex + 1);
  const totalBudget = entitlement.tokensIncluded + entitlement.extraTokens;
  const accruedTokens = Math.floor((totalBudget * accruedWindows) / totalWindows);
  const availableWindowTokens = Math.max(0, accruedTokens - entitlement.tokensUsed);

  return {
    windowStartAt: new Date(windowStartMs).toISOString(),
    windowEndsAt: new Date(windowEndsAtMs).toISOString(),
    windowDurationMs: FIVE_HOUR_WINDOW_MS,
    windowIndex,
    totalWindows,
    accruedTokens,
    availableWindowTokens,
  };
}

export function getAiAvailability(entitlement: LabsRuntimeEntitlement, now: Date = new Date()): AiAvailability {
  const remainingTokens = calculateRemainingTokens(entitlement);
  const remainingMessages = calculateRemainingMessages(entitlement);
  const window = getUsageWindowSnapshot(entitlement, now);

  if (entitlement.status === "PAUSED") {
    return {
      aiEnabled: false,
      humanInterventionAllowed: true,
      reason: "AI_PAUSED_MANUAL",
      remainingTokens,
      remainingMessages,
      availableWindowTokens: window.availableWindowTokens,
    };
  }

  if (entitlement.status !== "ACTIVE" && entitlement.status !== "TRIAL") {
    return {
      aiEnabled: false,
      humanInterventionAllowed: true,
      reason: "SERVICE_INACTIVE",
      remainingTokens,
      remainingMessages,
      availableWindowTokens: window.availableWindowTokens,
    };
  }

  if (remainingTokens <= 0 || window.availableWindowTokens <= 0) {
    return {
      aiEnabled: false,
      humanInterventionAllowed: true,
      reason: "AI_PAUSED_NO_TOKENS",
      remainingTokens,
      remainingMessages,
      availableWindowTokens: window.availableWindowTokens,
    };
  }

  return {
    aiEnabled: true,
    humanInterventionAllowed: true,
    reason: "OK",
    remainingTokens,
    remainingMessages,
    availableWindowTokens: window.availableWindowTokens,
  };
}

export function canTenantUseChannel(
  entitlement: LabsRuntimeEntitlement,
  channel: LabsChannel,
  now: Date = new Date(),
): ChannelAccessDecision {
  if (!entitlement.enabledChannels.includes(channel)) {
    return {
      allowed: false,
      requiresUpgrade: true,
      reason: "CHANNEL_NOT_INCLUDED",
      humanInterventionAllowed: true,
    };
  }

  const availability = getAiAvailability(entitlement, now);

  if (!availability.aiEnabled) {
    return {
      allowed: false,
      requiresUpgrade: false,
      reason: availability.reason,
      humanInterventionAllowed: availability.humanInterventionAllowed,
    };
  }

  return {
    allowed: true,
    requiresUpgrade: false,
    reason: "OK",
    humanInterventionAllowed: true,
  };
}

export function registerTokenConsumption(
  entitlement: LabsRuntimeEntitlement,
  input: RegisterTokenConsumptionInput,
): { entitlement: LabsRuntimeEntitlement; usage: TokenUsage; remainingTokens: number; remainingMessages: number; aiEnabled: boolean } {
  const access = canTenantUseChannel(entitlement, input.channel, input.occurredAt ? new Date(input.occurredAt) : new Date());

  if (!access.allowed) {
    throw new Error(access.reason);
  }

  const usage = createTokenUsage({
    globalTenantId: entitlement.globalTenantId,
    channel: input.channel,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    conversationId: input.conversationId,
    messageId: input.messageId,
    assistantId: input.assistantId,
    occurredAt: input.occurredAt,
  });

  const nextEntitlement = createRuntimeEntitlement({
    ...entitlement,
    tokensUsed: entitlement.tokensUsed + usage.totalTokens,
  });
  const availability = getAiAvailability(nextEntitlement, input.occurredAt ? new Date(input.occurredAt) : new Date());

  return {
    entitlement: createRuntimeEntitlement({
      ...nextEntitlement,
      status: availability.aiEnabled ? nextEntitlement.status : "PAUSED",
    }),
    usage,
    remainingTokens: availability.remainingTokens,
    remainingMessages: availability.remainingMessages,
    aiEnabled: availability.aiEnabled,
  };
}
