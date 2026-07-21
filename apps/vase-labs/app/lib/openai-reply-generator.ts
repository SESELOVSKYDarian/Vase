export type OpenAiModelProfileId = "fast" | "balanced" | "premium";

export interface OpenAiModelProfile {
  id: OpenAiModelProfileId;
  label: string;
  model: string;
  description: string;
}

export interface AiReplyResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  provider?: "openai";
  model?: string;
  profile?: OpenAiModelProfileId;
}

type FetchLike = typeof fetch;

interface CreateOpenAiReplyGeneratorInput {
  apiKey?: string;
  model?: string | null;
  profileId?: string | null;
  env?: NodeJS.ProcessEnv;
  fetcher?: FetchLike;
}

const fallbackModels: Record<OpenAiModelProfileId, string> = {
  fast: "gpt-4.1-mini",
  balanced: "gpt-4.1",
  premium: "gpt-5.6",
};

const profileCopy: Record<OpenAiModelProfileId, Pick<OpenAiModelProfile, "label" | "description">> = {
  fast: {
    label: "Rapido",
    description: "Respuestas de bajo costo y baja latencia para atencion operativa.",
  },
  balanced: {
    label: "Balanceado",
    description: "Mejor equilibrio entre calidad, velocidad y costo para ventas y soporte.",
  },
  premium: {
    label: "Premium",
    description: "Mayor calidad para conversaciones complejas o marcas con asistencia avanzada.",
  },
};

export function isOpenAiModelProfileId(value: string | null | undefined): value is OpenAiModelProfileId {
  return value === "fast" || value === "balanced" || value === "premium";
}

export function getOpenAiModelProfiles(env: NodeJS.ProcessEnv = process.env): OpenAiModelProfile[] {
  const defaultModel = env.OPENAI_DEFAULT_MODEL ?? env.OPENAI_MODEL;
  const configured: Record<OpenAiModelProfileId, string> = {
    fast: env.OPENAI_MODEL_FAST ?? defaultModel ?? fallbackModels.fast,
    balanced: env.OPENAI_MODEL_BALANCED ?? defaultModel ?? fallbackModels.balanced,
    premium: env.OPENAI_MODEL_PREMIUM ?? defaultModel ?? fallbackModels.premium,
  };

  return (["fast", "balanced", "premium"] as const).map((id) => ({
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
  const requested = input.profileId ?? env.OPENAI_MODEL_PROFILE ?? "balanced";
  const profileId = isOpenAiModelProfileId(requested) ? requested : "balanced";
  const profile = getOpenAiModelProfiles(env).find((item) => item.id === profileId);

  if (!profile) {
    throw new Error("OPENAI_MODEL_PROFILE_UNAVAILABLE");
  }

  return profile;
}

export function getDefaultOpenAiModel(env: NodeJS.ProcessEnv = process.env): string {
  return resolveOpenAiModelProfile({ env }).model;
}

export function createOpenAiReplyGenerator(input: CreateOpenAiReplyGeneratorInput = {}) {
  const env = input.env ?? process.env;
  const apiKey = input.apiKey ?? env.OPENAI_API_KEY;
  const fetcher = input.fetcher ?? fetch;
  const profile = resolveOpenAiModelProfile({ profileId: input.profileId, env });
  const model = input.model?.trim() || profile.model;

  return {
    profile,
    async generateReply(request: { userText: string; context: string }): Promise<AiReplyResult> {
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY_MISSING");
      }

      const response = await fetcher("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          instructions: buildSystemInstructions(request.context),
          input: request.userText,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(readOpenAiError(payload) ?? `OPENAI_RESPONSE_FAILED_${response.status}`);
      }

      const text = extractOutputText(payload);
      if (!text) {
        throw new Error("OPENAI_RESPONSE_EMPTY");
      }

      return {
        text,
        inputTokens: readUsageToken(payload, "input_tokens"),
        outputTokens: readUsageToken(payload, "output_tokens"),
        provider: "openai",
        model,
        profile: profile.id,
      };
    },
  };
}

function buildSystemInstructions(context: string): string {
  return [
    "Sos el asistente comercial de Vase Labs para un negocio conectado por canales oficiales.",
    "Responde en el mismo idioma del cliente, con tono claro, breve y orientado a resolver.",
    "Usa solamente el contexto disponible cuando menciones politicas, horarios, precios, stock o datos del negocio.",
    "Si falta informacion, pedila de forma concreta o deriva a un humano.",
    context ? `Contexto disponible:\n${context}` : "Contexto disponible: sin informacion cargada.",
  ].join("\n\n");
}

function extractOutputText(payload: unknown): string {
  const source = payload as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: unknown }> }> } | null;

  if (typeof source?.output_text === "string") {
    return source.output_text.trim();
  }

  return (source?.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .filter((text): text is string => typeof text === "string")
    .join("\n")
    .trim();
}

function readUsageToken(payload: unknown, key: "input_tokens" | "output_tokens"): number {
  const value = (payload as { usage?: Record<string, unknown> } | null)?.usage?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readOpenAiError(payload: unknown): string | null {
  const message = (payload as { error?: { message?: unknown } } | null)?.error?.message;
  return typeof message === "string" && message ? message : null;
}
