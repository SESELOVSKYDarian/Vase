import type { LabsPlan } from "@vase/contracts";

export const USD_MICROS = 1_000_000;

export type AiBudgetStatus = "NORMAL" | "WARNING" | "CRITICAL" | "EXHAUSTED";

export type AiModelPricing = {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
};

const planBudgetsUsd = {
  STARTER: 5,
  GROWTH: 15,
  PRO: 40,
} as const satisfies Record<LabsPlan, number>;

const modelPricingDefaults = {
  "gpt-5-mini": { inputUsdPerMillion: 0.25, outputUsdPerMillion: 2 },
  "gpt-4o": { inputUsdPerMillion: 2.5, outputUsdPerMillion: 10 },
  "gpt-4.1": { inputUsdPerMillion: 2, outputUsdPerMillion: 8 },
  "gpt-5.6-sol": { inputUsdPerMillion: 2.5, outputUsdPerMillion: 15 },
  "gpt-5.6-terra": { inputUsdPerMillion: 1.25, outputUsdPerMillion: 7.5 },
  "gpt-5.6-luna": { inputUsdPerMillion: 0.5, outputUsdPerMillion: 3 },
  "gpt-5.4-mini": { inputUsdPerMillion: 0.375, outputUsdPerMillion: 2.25 },
  "gpt-5.4": { inputUsdPerMillion: 1.25, outputUsdPerMillion: 7.5 },
} as const satisfies Record<string, AiModelPricing>;

export function usdToMicros(value: number): number {
  return Math.max(0, Math.round(value * USD_MICROS));
}

export function microsToUsd(value: number): number {
  return Math.max(0, value) / USD_MICROS;
}

export function getPlanAiBudgetMicros(plan: LabsPlan): number {
  return usdToMicros(planBudgetsUsd[plan]);
}

function envKeyForModel(model: string, suffix: "INPUT_USD_PER_1M" | "OUTPUT_USD_PER_1M") {
  return `OPENAI_PRICE_${model.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_${suffix}`;
}

function parseEnvPrice(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function getAiModelPricing(
  model: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): AiModelPricing {
  const normalized = model?.trim() || "gpt-5-mini";
  const defaults = modelPricingDefaults[normalized as keyof typeof modelPricingDefaults]
    ?? modelPricingDefaults["gpt-5-mini"];
  return {
    inputUsdPerMillion: parseEnvPrice(env[envKeyForModel(normalized, "INPUT_USD_PER_1M")])
      ?? defaults.inputUsdPerMillion,
    outputUsdPerMillion: parseEnvPrice(env[envKeyForModel(normalized, "OUTPUT_USD_PER_1M")])
      ?? defaults.outputUsdPerMillion,
  };
}

export function estimateAiUsageCostMicros(input: {
  model?: string | null;
  inputTokens: number;
  outputTokens: number;
  env?: NodeJS.ProcessEnv;
}): number {
  const pricing = getAiModelPricing(input.model, input.env);
  const inputCost = (Math.max(0, input.inputTokens) / 1_000_000) * pricing.inputUsdPerMillion;
  const outputCost = (Math.max(0, input.outputTokens) / 1_000_000) * pricing.outputUsdPerMillion;
  return usdToMicros(inputCost + outputCost);
}

export function parseModelFromUsageSource(source: string | null | undefined): string | null {
  const parts = source?.split(":") ?? [];
  return parts[0] === "openai" && parts[1] ? parts[1] : null;
}

export function calculateAiBudget(input: {
  plan: LabsPlan;
  aiBudgetMicros?: number | null;
  extraAiBudgetMicros?: number | null;
  aiBudgetUsedMicros?: number | null;
}) {
  const included = input.aiBudgetMicros && input.aiBudgetMicros > 0
    ? input.aiBudgetMicros
    : getPlanAiBudgetMicros(input.plan);
  const extra = Math.max(0, input.extraAiBudgetMicros ?? 0);
  const used = Math.max(0, input.aiBudgetUsedMicros ?? 0);
  const total = included + extra;
  const remaining = Math.max(0, total - used);
  const usageRatio = total > 0 ? used / total : 0;
  const status: AiBudgetStatus = remaining <= 0
    ? "EXHAUSTED"
    : usageRatio >= 0.9
      ? "CRITICAL"
      : usageRatio >= 0.7
        ? "WARNING"
        : "NORMAL";

  return {
    includedMicros: included,
    extraMicros: extra,
    totalMicros: total,
    usedMicros: used,
    remainingMicros: remaining,
    usagePercent: Math.min(100, Math.round(usageRatio * 1000) / 10),
    status,
  };
}

export function estimateRemainingAiReplies(input: {
  remainingMicros: number;
  averageCostMicros?: number | null;
}) {
  const average = input.averageCostMicros && input.averageCostMicros > 0
    ? input.averageCostMicros
    : estimateAiUsageCostMicros({
        model: "gpt-5-mini",
        inputTokens: 1500,
        outputTokens: 500,
      });
  return Math.floor(Math.max(0, input.remainingMicros) / average);
}
