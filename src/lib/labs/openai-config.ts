export const DEFAULT_OPENAI_MODEL = "gpt-5.5";
export const OPENAI_SYSTEM_PROMPT_MAX_LENGTH = 4000;

export const OPENAI_MODEL_OPTIONS = [
  {
    value: "gpt-5.5",
    label: "GPT-5.5",
    description: "Mayor calidad para respuestas comerciales y razonamiento.",
  },
  {
    value: "gpt-5.5-pro",
    label: "GPT-5.5 Pro",
    description: "Mas preciso para casos dificiles, con mayor costo.",
  },
  {
    value: "gpt-5.4",
    label: "GPT-5.4",
    description: "Balance entre calidad, velocidad y costo.",
  },
  {
    value: "gpt-5.4-pro",
    label: "GPT-5.4 Pro",
    description: "Mas compute para consultas complejas.",
  },
  {
    value: "gpt-5.4-mini",
    label: "GPT-5.4 mini",
    description: "Rapido y economico para alto volumen.",
  },
  {
    value: "gpt-5.4-nano",
    label: "GPT-5.4 nano",
    description: "Menor costo para respuestas simples.",
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
): Record<string, unknown> {
  const current = asRecord(currentContext);
  const existing = readOpenAiBusinessConfig(current);
  const apiKey = input.clearApiKey
    ? undefined
    : input.apiKey?.trim() || existing.apiKey;
  const model = input.model?.trim() || existing.model || DEFAULT_OPENAI_MODEL;
  const openAiConfig: Record<string, unknown> = {
    enabled: input.enabled,
    model: isSupportedOpenAiModel(model) ? model : DEFAULT_OPENAI_MODEL,
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
