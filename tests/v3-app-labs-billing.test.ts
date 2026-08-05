import { describe, expect, it } from "vitest";
import { getLabsPlanLimits } from "../packages/contracts/src/index";
import {
  calculateRemainingMessages,
  calculateRemainingTokens,
  canTenantUseChannel,
  createRuntimeEntitlement,
  getAiAvailability,
} from "../apps/vase-labs/app/lib/billing";

describe("Vase Labs split-service billing", () => {
  it("keeps the canonical Growth limits visible to the current service", () => {
    const limits = getLabsPlanLimits("GROWTH");
    const entitlement = createRuntimeEntitlement({
      globalTenantId: "tenant_123",
      plan: "GROWTH",
      status: "ACTIVE",
      enabledChannels: [...limits.includedChannels],
      tokenPack: "BASIC",
      tokensIncluded: limits.monthlyTokenLimit,
      tokensUsed: 82000,
      extraTokens: 100000,
      currentPeriodStart: "2026-06-24T00:00:00.000Z",
      renewsAt: "2026-07-24T00:00:00.000Z",
    });

    expect(calculateRemainingTokens(entitlement)).toBe(1018000);
    expect(calculateRemainingMessages(entitlement)).toBeGreaterThan(0);
    expect(getAiAvailability(entitlement).aiEnabled).toBe(true);
    expect(canTenantUseChannel(entitlement, "WHATSAPP").allowed).toBe(true);
    expect(canTenantUseChannel(entitlement, "FACEBOOK").allowed).toBe(true);
  });
});
