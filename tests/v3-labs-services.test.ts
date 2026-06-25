import { describe, expect, it } from "vitest";
import {
  FIVE_HOUR_WINDOW_MS,
  calculateRemainingMessages,
  calculateRemainingTokens,
  calculateUsedTokens,
  canTenantUseChannel,
  createRuntimeEntitlement,
  getAiAvailability,
  getUsageWindowSnapshot,
  registerTokenConsumption,
} from "../apps/vase-labs/app/lib/billing";

function createEntitlement(overrides?: Partial<ReturnType<typeof createRuntimeEntitlement>>) {
  return createRuntimeEntitlement({
    globalTenantId: "tenant_123",
    plan: "GROWTH",
    status: "ACTIVE",
    enabledChannels: ["WHATSAPP", "INSTAGRAM"],
    tokenPack: "BASIC",
    tokensIncluded: 250000,
    tokensUsed: 0,
    extraTokens: 100000,
    currentPeriodStart: "2026-06-24T00:00:00.000Z",
    renewsAt: "2026-06-26T02:00:00.000Z",
    ...overrides,
  });
}

describe("Vase Labs runtime services", () => {
  it("allows only included channels and flags upgrade requirements", () => {
    const entitlement = createEntitlement();

    expect(canTenantUseChannel(entitlement, "WHATSAPP").allowed).toBe(true);
    expect(canTenantUseChannel(entitlement, "FACEBOOK")).toMatchObject({
      allowed: false,
      requiresUpgrade: true,
      reason: "CHANNEL_NOT_INCLUDED",
    });
  });

  it("calculates used, remaining tokens and estimated remaining messages", () => {
    const entitlement = createEntitlement({
      tokensIncluded: 250000,
      tokensUsed: 120000,
      extraTokens: 40000,
    });

    expect(calculateUsedTokens([{ totalTokens: 100 }, { totalTokens: 250 }])).toBe(350);
    expect(calculateRemainingTokens(entitlement)).toBe(170000);
    expect(calculateRemainingMessages(entitlement)).toBe(340);
  });

  it("registers token consumption and updates the tenant balance", () => {
    const entitlement = createEntitlement({
      tokensIncluded: 1000,
      tokensUsed: 400,
      extraTokens: 0,
    });

    const result = registerTokenConsumption(entitlement, {
      channel: "INSTAGRAM",
      inputTokens: 150,
      outputTokens: 250,
      assistantId: "assistant_123",
      conversationId: "conv_123",
      messageId: "msg_123",
      occurredAt: "2026-06-25T21:00:00.000Z",
    });

    expect(result.usage.totalTokens).toBe(400);
    expect(result.entitlement.tokensUsed).toBe(800);
    expect(result.remainingTokens).toBe(200);
    expect(result.aiEnabled).toBe(true);
  });

  it("pauses AI when the tenant runs out of available tokens but keeps human intervention enabled", () => {
    const entitlement = createEntitlement({
      tokensIncluded: 1000,
      tokensUsed: 1000,
      extraTokens: 0,
    });

    const availability = getAiAvailability(entitlement);

    expect(availability.aiEnabled).toBe(false);
    expect(availability.reason).toBe("AI_PAUSED_NO_TOKENS");
    expect(availability.humanInterventionAllowed).toBe(true);
  });

  it("accumulates 5-hour windows across the billing period", () => {
    const entitlement = createEntitlement({
      tokensIncluded: 4800,
      tokensUsed: 0,
      extraTokens: 0,
      currentPeriodStart: "2026-06-24T00:00:00.000Z",
      renewsAt: "2026-06-25T00:00:00.000Z",
    });

    const snapshot = getUsageWindowSnapshot(entitlement, new Date("2026-06-24T10:30:00.000Z"));

    expect(snapshot.windowDurationMs).toBe(FIVE_HOUR_WINDOW_MS);
    expect(snapshot.windowIndex).toBe(2);
    expect(snapshot.totalWindows).toBe(5);
    expect(snapshot.accruedTokens).toBe(2880);
    expect(snapshot.availableWindowTokens).toBe(2880);
  });
});
