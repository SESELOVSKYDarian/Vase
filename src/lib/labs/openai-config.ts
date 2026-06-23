import type { AiWorkspacePlan } from "@prisma/client";

export const DEFAULT_OPENAI_MODEL = "gpt-5-nano";
export const OPENAI_SYSTEM_PROMPT_MAX_LENGTH = 4000;

export const OPENAI_MODEL_OPTIONS = [
  {
    value: "gpt-5-nano",
    label: "GPT-5 nano",
    description: "Modelo base de bajo costo para controlar consumo de tokens.",
    requiresPaidPlan: false,
  },
  {
    value: "gpt-5.5",
    label: "GPT-5.5",
    description: "Mayor calidad para respuestas comerciales y razonamiento.",
    requiresPaidPlan: true,
  },
  {
    value: "gpt-5.5-pro",
    label: "GPT-5.5 Pro",
    description: "Mas preciso para casos dificiles, con mayor costo.",
    requiresPaidPlan: true,
  },
  {
    value: "gpt-5.4",
    label: "GPT-5.4",
    description: "Balance entre calidad, velocidad y costo.",
    requiresPaidPlan: true,
  },
  {
    value: "gpt-5.4-pro",
    label: "GPT-5.4 Pro",
    description: "Mas compute para consultas complejas.",
    requiresPaidPlan: true,
  },
  {
    value: "gpt-5.4-mini",
    label: "GPT-5.4 mini",
    description: "Rapido y economico para alto volumen.",
    requiresPaidPlan: true,
  },
  {
    value: "gpt-5.4-nano",
    label: "GPT-5.4 nano",
    description: "Menor costo para respuestas simples.",
    requiresPaidPlan: true,
  },
] as const;

const supportedOpenAiModels = new Set(OPENAI_MODEL_OPTIONS.map((option) => option.value));

export type LabsOpenAiBusinessConfig = {
  enabled: boolean;
  model: string;
  apiKey?: string;
  hasApiKey: boolean;
  updatedAt?: string;
};

type OpenAiBusinessConfigInput = {
  enabled: boolean;
  model?: string;
  apiKey?: string;
  clearApiKey?: boolean;
};

type BuildOpenAiBusinessContextOptions = {
  plan?: AiWorkspacePlan;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readOpenAiSource(context: unknown) {
  return asRecord(asRecord(context).openai);
}

export function isSupportedOpenAiModel(model: string) {
  return supportedOpenAiModels.has(model.trim() as (typeof OPENAI_MODEL_OPTIONS)[number]["value"]);
}

export function canUseOpenAiModelForPlan(model: string, plan: AiWorkspacePlan = "START") {
  const option = OPENAI_MODEL_OPTIONS.find((item) => item.value === model.trim());

  if (!option) {
    return false;
  }

  return plan === "PREMIUM" || !option.requiresPaidPlan;
}

export function resolveOpenAiModelForPlan(model: string | undefined, plan: AiWorkspacePlan = "START") {
  const requestedModel = model?.trim() || DEFAULT_OPENAI_MODEL;

  if (!isSupportedOpenAiModel(requestedModel)) {
    return DEFAULT_OPENAI_MODEL;
  }

  return canUseOpenAiModelForPlan(requestedModel, plan)
    ? requestedModel
    : DEFAULT_OPENAI_MODEL;
}

export function getOpenAiModelOptionsForPlan(plan: AiWorkspacePlan) {
  return OPENAI_MODEL_OPTIONS.map((option) => ({
    ...option,
    isAvailable: canUseOpenAiModelForPlan(option.value, plan),
  }));
}

export function readOpenAiBusinessConfig(
  businessContext: unknown,
  fallbackModel = DEFAULT_OPENAI_MODEL,
): LabsOpenAiBusinessConfig {
  const source = readOpenAiSource(businessContext);
  const apiKey = typeof source.apiKey === "string" ? source.apiKey : undefined;
  const model = typeof source.model === "string" && source.model.trim().length
    ? source.model.trim()
    : fallbackModel;

  return {
    enabled: source.enabled === true,
    model,
    apiKey,
    hasApiKey: Boolean(apiKey || source.hasApiKey === true),
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : undefined,
  };
}

export function buildOpenAiBusinessContext(
  currentContext: unknown,
  input: OpenAiBusinessConfigInput,
  options: BuildOpenAiBusinessContextOptions = {},
): Record<string, unknown> {
  const current = asRecord(currentContext);
  const existing = readOpenAiBusinessConfig(current);
  const apiKey = input.clearApiKey
    ? undefined
    : input.apiKey?.trim() || existing.apiKey;
  const model = resolveOpenAiModelForPlan(
    input.model?.trim() || existing.model || DEFAULT_OPENAI_MODEL,
    options.plan,
  );
  const openAiConfig: Record<string, unknown> = {
    enabled: input.enabled,
    model,
    hasApiKey: Boolean(apiKey),
    updatedAt: new Date().toISOString(),
  };

  if (apiKey) {
    openAiConfig.apiKey = apiKey;
  }

  return {
    ...current,
    openai: openAiConfig,
  };
}

export function stripAiProviderSecretsFromBusinessContext(context: unknown): Record<string, unknown> {
  const safeContext = { ...asRecord(context) };
  delete safeContext.openai;
  delete safeContext.aiProvider;
  return safeContext;
}
