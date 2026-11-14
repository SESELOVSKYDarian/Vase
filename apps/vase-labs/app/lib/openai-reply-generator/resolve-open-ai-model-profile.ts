// Parte de openai-reply-generator.ts: OpenAiModelProfileId, OpenAiModelProfile, AiReplyResult, AiOrderAction, FetchLike, CreateOpenAiReplyGeneratorInput y más.

export type OpenAiModelProfileId = "economic" | "professional" | "enterprise";

export interface OpenAiModelProfile {
  id: OpenAiModelProfileId;
  label: string;
  model: string;
  description: string;
}

export interface AiReplyResult {
  text: string;
  imageUrls: string[];
  orderAction?: AiOrderAction;
  /** El asistente pide que lo atienda una persona (no encontró lo que buscan, pide algo que no puede resolver...). */
  handoff?: { needed: boolean; reason: string };
  inputTokens: number;
  outputTokens: number;
  provider?: "openai";
  model?: string;
  profile?: OpenAiModelProfileId;
}

export type AiOrderAction =
  | { type: "NONE" }
  | {
      type: "PREPARE";
      items: Array<{ productId: string; quantity: number }>;
      customer: { name: string; phone: string; email?: string };
      fulfillment: {
        type: "DELIVERY" | "PICKUP";
        branchId?: string;
        pickupLabel?: string;
        address?: string;
      };
      notes?: string;
    };

export type FetchLike = typeof fetch;

export interface CreateOpenAiReplyGeneratorInput {
  apiKey?: string;
  model?: string | null;
  profileId?: string | null;
  env?: NodeJS.ProcessEnv;
  fetcher?: FetchLike;
}

export const fallbackModels: Record<OpenAiModelProfileId, string> = {
  economic: "gpt-5-mini",
  professional: "gpt-4.1",
  enterprise: "gpt-5.6-sol",
};

export const profileCopy: Record<OpenAiModelProfileId, Pick<OpenAiModelProfile, "label" | "description">> = {
  economic: {
    label: "⚡ Económico",
    description: "Atención al cliente, FAQs, WhatsApp y pedidos.",
  },
  professional: {
    label: "🚀 Profesional",
    description: "La gran mayoría de las empresas.",
  },
  enterprise: {
    label: "👑 Enterprise",
    description: "Empresas con procesos complejos y análisis avanzados.",
  },
};

export function isOpenAiModelProfileId(value: string | null | undefined): value is OpenAiModelProfileId {
  return value === "economic" || value === "professional" || value === "enterprise";
}

export function normalizeOpenAiModelProfileId(value: string | null | undefined): OpenAiModelProfileId {
  if (isOpenAiModelProfileId(value)) return value;
  return "economic";
}

export function getOpenAiModelProfiles(env: NodeJS.ProcessEnv = process.env): OpenAiModelProfile[] {
  const defaultModel = env.OPENAI_DEFAULT_MODEL ?? env.OPENAI_MODEL;
  const configured: Record<OpenAiModelProfileId, string> = {
    economic: env.OPENAI_MODEL_ECONOMIC ?? defaultModel ?? fallbackModels.economic,
    professional: env.OPENAI_MODEL_PROFESSIONAL ?? defaultModel ?? fallbackModels.professional,
    enterprise: env.OPENAI_MODEL_ENTERPRISE ?? defaultModel ?? fallbackModels.enterprise,
  };

  return (["economic", "professional", "enterprise"] as const).map((id) => ({
    id,
    model: configured[id],
    ...profileCopy[id],
  }));
}

export function resolveOpenAiModelProfile(input: {
  profileId?: string | null;
  env?: NodeJS.ProcessEnv;
} = {}): OpenAiModelProfile {
  const env = input.env ?? process.env;
  const requested = input.profileId ?? env.OPENAI_MODEL_PROFILE ?? "economic";
  const profileId = normalizeOpenAiModelProfileId(requested);
  const profile = getOpenAiModelProfiles(env).find((item) => item.id === profileId);

  if (!profile) {
    throw new Error("OPENAI_MODEL_PROFILE_UNAVAILABLE");
  }

  return profile;
}

export function getDefaultOpenAiModel(env: NodeJS.ProcessEnv = process.env): string {
  return resolveOpenAiModelProfile({ env }).model;
}

export function resolveApprovedOpenAiModel(
  model: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const requested = model?.trim();
  const approvedModels = getOpenAiModelProfiles(env).map((profile) => profile.model);
  if (requested && approvedModels.includes(requested)) return requested;
  return getDefaultOpenAiModel(env);
}
