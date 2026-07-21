export type OpenAiModelProfileId = "fast" | "everyday" | "tools" | "premium";

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
  fast: "gpt-5-mini",
  everyday: "gpt-4o",
  tools: "gpt-4.1",
  premium: "gpt-5.6-sol",
};

const profileCopy: Record<OpenAiModelProfileId, Pick<OpenAiModelProfile, "label" | "description">> = {
  fast: {
    label: "Rápido",
    description: "Baja latencia y costo para consultas frecuentes y alto volumen.",
  },
  everyday: {
    label: "Uso cotidiano",
    description: "Modelo versátil para atención general y automatizaciones habituales.",
  },
  tools: {
    label: "Herramientas",
    description: "Seguimiento preciso de instrucciones extensas y llamadas a APIs.",
  },
  premium: {
    label: "Premium",
    description: "Razonamiento avanzado para conversaciones y casos complejos.",
  },
};

export function isOpenAiModelProfileId(value: string | null | undefined): value is OpenAiModelProfileId {
  return value === "fast" || value === "everyday" || value === "tools" || value === "premium";
}

export function getOpenAiModelProfiles(env: NodeJS.ProcessEnv = process.env): OpenAiModelProfile[] {
  const defaultModel = env.OPENAI_DEFAULT_MODEL ?? env.OPENAI_MODEL;
  const configured: Record<OpenAiModelProfileId, string> = {
    fast: env.OPENAI_MODEL_FAST ?? defaultModel ?? fallbackModels.fast,
    everyday: env.OPENAI_MODEL_EVERYDAY ?? env.OPENAI_MODEL_BALANCED ?? defaultModel ?? fallbackModels.everyday,
    tools: env.OPENAI_MODEL_TOOLS ?? defaultModel ?? fallbackModels.tools,
    premium: env.OPENAI_MODEL_PREMIUM ?? defaultModel ?? fallbackModels.premium,
  };

  return (["fast", "everyday", "tools", "premium"] as const).map((id) => ({
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
  const requested = input.profileId ?? env.OPENAI_MODEL_PROFILE ?? "fast";
  const profileId = isOpenAiModelProfileId(requested) ? requested : "fast";
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
    async generateReply(request: { userText: string; context: string; systemPrompt?: string | null }): Promise<AiReplyResult> {
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
          instructions: buildSystemInstructions({
            context: request.context,
            systemPrompt: request.systemPrompt,
          }),
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

export async function validateOpenAiCredential(input: {
  apiKey: string;
  model: string;
  fetcher?: FetchLike;
}): Promise<{ ok: true; model: string }> {
  const fetcher = input.fetcher ?? fetch;
  const response = await fetcher(
    `https://api.openai.com/v1/models/${encodeURIComponent(input.model)}`,
    { headers: { Authorization: `Bearer ${input.apiKey}` } },
  );

  if (response.status === 401 || response.status === 403) {
    throw new Error("OPENAI_CREDENTIAL_REJECTED");
  }
  if (response.status === 404) {
    throw new Error("OPENAI_MODEL_UNAVAILABLE");
  }
  if (!response.ok) {
    throw new Error("OPENAI_VALIDATION_UNAVAILABLE");
  }

  return { ok: true, model: input.model };
}

function buildSystemInstructions(input: { context: string; systemPrompt?: string | null }): string {
  const customerPrompt = input.systemPrompt?.trim();
  return [
    "Sos el asistente comercial de Vase Labs para un negocio conectado por canales oficiales.",
    customerPrompt ? `Instrucciones del negocio:\n${customerPrompt}` : null,
    "Responde en el mismo idioma del cliente, con tono claro, breve y orientado a resolver.",
    "Usa solamente el contexto disponible cuando menciones politicas, horarios, precios, stock o datos del negocio.",
    "Si falta informacion, pedila de forma concreta o deriva a un humano.",
    input.context ? `Contexto disponible:\n${input.context}` : "Contexto disponible: sin informacion cargada.",
  ].filter(Boolean).join("\n\n");
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
