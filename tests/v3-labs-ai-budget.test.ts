import { describe, expect, it } from "vitest";
import {
  calculateAiBudget,
  estimateAiUsageCostMicros,
  estimateRemainingAiReplies,
  getAiModelPricing,
  getPlanAiBudgetMicros,
  microsToUsd,
  parseModelFromUsageSource,
} from "../apps/vase-labs/app/lib/ai-budget";
import {
  createRuntimeEntitlement,
  getAiAvailability,
  registerTokenConsumption,
} from "../apps/vase-labs/app/lib/billing";

describe("Vase Labs AI budget planning", () => {
  it("assigns USD budgets by plan and reports critical usage near a 5 dollar Starter cap", () => {
    const budget = calculateAiBudget({
      plan: "STARTER",
      aiBudgetUsedMicros: 4_420_000,
    });

    expect(microsToUsd(getPlanAiBudgetMicros("STARTER"))).toBe(5);
    expect(budget.totalMicros).toBe(5_000_000);
    expect(budget.usedMicros).toBe(4_420_000);
    expect(budget.remainingMicros).toBe(580_000);
    expect(budget.usagePercent).toBe(88.4);
    expect(budget.status).toBe("WARNING");
  });

  it("estimates cost from the actual OpenAI model profile used by Labs", () => {
    const fastCost = estimateAiUsageCostMicros({
      model: "gpt-5-mini",
      inputTokens: 1500,
      outputTokens: 500,
    });
    const premiumCost = estimateAiUsageCostMicros({
      model: "gpt-5.6-sol",
      inputTokens: 1500,
      outputTokens: 500,
    });

    expect(getAiModelPricing("gpt-5-mini")).toMatchObject({
      inputUsdPerMillion: 0.25,
      outputUsdPerMillion: 2,
    });
    expect(premiumCost).toBeGreaterThan(fastCost);
    expect(parseModelFromUsageSource("openai:gpt-5-mini:economic")).toBe("gpt-5-mini");
  });

  it("pauses AI when the dollar budget is exhausted but keeps human handoff available", () => {
    const entitlement = createRuntimeEntitlement({
      globalTenantId: "tenant_123",
      plan: "STARTER",
      status: "ACTIVE",
      enabledChannels: ["WHATSAPP"],
      tokenPack: null,
      tokensIncluded: 50000,
      tokensUsed: 1000,
      extraTokens: 0,
      aiBudgetMicros: 5_000_000,
      aiBudgetUsedMicros: 5_000_000,
      extraAiBudgetMicros: 0,
      currentPeriodStart: null,
      renewsAt: null,
    });

    expect(getAiAvailability(entitlement)).toMatchObject({
      aiEnabled: false,
      reason: "AI_PAUSED_NO_BUDGET",
      humanInterventionAllowed: true,
      remainingAiBudgetMicros: 0,
      aiBudgetStatus: "EXHAUSTED",
    });
  });

  it("keeps AI enabled when legacy token balance is exhausted but dollar budget remains", () => {
    const entitlement = createRuntimeEntitlement({
      globalTenantId: "tenant_123",
      plan: "STARTER",
      status: "ACTIVE",
      enabledChannels: ["WHATSAPP"],
      tokenPack: null,
      tokensIncluded: 50000,
      tokensUsed: 569970,
      extraTokens: 0,
      aiBudgetMicros: 5_000_000,
      aiBudgetUsedMicros: 4_420_000,
      extraAiBudgetMicros: 0,
      currentPeriodStart: null,
      renewsAt: null,
    });

    expect(getAiAvailability(entitlement)).toMatchObject({
      aiEnabled: true,
      reason: "OK",
      remainingTokens: 0,
      remainingAiBudgetMicros: 580_000,
      aiBudgetStatus: "WARNING",
    });
  });

  it("increments the AI budget usage when registering token consumption", () => {
    const entitlement = createRuntimeEntitlement({
      globalTenantId: "tenant_123",
      plan: "STARTER",
      status: "ACTIVE",
      enabledChannels: ["WHATSAPP"],
      tokenPack: null,
      tokensIncluded: 50000,
      tokensUsed: 1000,
      extraTokens: 0,
      aiBudgetMicros: 5_000_000,
      aiBudgetUsedMicros: 4_420_000,
      extraAiBudgetMicros: 0,
      currentPeriodStart: null,
      renewsAt: null,
    });

    const result = registerTokenConsumption(entitlement, {
      channel: "WHATSAPP",
      inputTokens: 100,
      outputTokens: 100,
      costMicros: 250,
    });

    expect(result.entitlement.tokensUsed).toBe(1200);
    expect(result.entitlement.aiBudgetUsedMicros).toBe(4_420_250);
    expect(estimateRemainingAiReplies({ remainingMicros: result.remainingAiBudgetMicros })).toBeGreaterThan(0);
  });
});
