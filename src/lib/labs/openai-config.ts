export const DEFAULT_OPENAI_MODEL = "gpt-5.5";

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

  return {
    ...current,
    openai: {
      enabled: input.enabled,
      model: input.model?.trim() || existing.model || DEFAULT_OPENAI_MODEL,
      apiKey,
      hasApiKey: Boolean(apiKey),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function stripAiProviderSecretsFromBusinessContext(context: unknown): Record<string, unknown> {
  const safeContext = { ...asRecord(context) };
  delete safeContext.openai;
  delete safeContext.aiProvider;
  return safeContext;
}
