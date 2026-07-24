import { normalizePublicHttpsImageUrl } from "./public-image-url";

export type OpenAiModelProfileId = "fast" | "everyday" | "tools" | "premium";

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
      fulfillment: { type: "DELIVERY" | "PICKUP"; branchId?: string; address?: string };
      notes?: string;
    };

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
    async generateReply(request: {
      userText: string;
      context: string;
      systemPrompt?: string | null;
      allowedImageUrls?: string[];
    }): Promise<AiReplyResult> {
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY_MISSING");
      }

      const baseRequestBody = {
        model,
        instructions: buildSystemInstructions({
          context: request.context,
          systemPrompt: request.systemPrompt,
        }),
        input: request.userText,
      };
      const response = await fetcher("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...baseRequestBody,
          text: {
            format: {
              type: "json_schema",
              name: "vase_catalog_reply",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  text: { type: "string" },
                  imageUrls: {
                    type: "array",
                    items: { type: "string" },
                    maxItems: 3,
                  },
                  orderAction: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      type: { type: "string", enum: ["NONE", "PREPARE"] },
                      items: {
                        type: "array",
                        items: {
                          type: "object",
                          additionalProperties: false,
                          properties: {
                            productId: { type: "string" },
                            quantity: { type: "integer", minimum: 1 },
                          },
                          required: ["productId", "quantity"],
                        },
                      },
                      customer: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          name: { type: "string" },
                          phone: { type: "string" },
                          email: { type: "string" },
                        },
                        required: ["name", "phone", "email"],
                      },
                      fulfillment: {
                        type: "object",
                        additionalProperties: false,
                        properties: {
                          type: { type: "string", enum: ["DELIVERY", "PICKUP"] },
                          branchId: { type: "string" },
                          address: { type: "string" },
                        },
                        required: ["type", "branchId", "address"],
                      },
                      notes: { type: "string" },
                    },
                    required: ["type", "items", "customer", "fulfillment", "notes"],
                  },
                },
                required: ["text", "imageUrls", "orderAction"],
              },
            },
          },
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(readOpenAiError(payload) ?? `OPENAI_RESPONSE_FAILED_${response.status}`);
      }

      if (hasRefusal(payload)) {
        throw new Error("OPENAI_RESPONSE_REFUSED");
      }
      const outputText = extractOutputText(payload);
      if (!outputText) {
        throw new Error("OPENAI_RESPONSE_EMPTY");
      }
      const structuredReply = parseStructuredReply(outputText);
      const allowedImageUrls = new Set(
        (request.allowedImageUrls ?? [])
          .map(normalizePublicHttpsImageUrl)
          .filter((url): url is string => Boolean(url)),
      );
      const imageUrls = [...new Set(
        structuredReply.imageUrls.filter((url) => allowedImageUrls.has(url)),
      )].slice(0, 3);

      return {
        text: structuredReply.text,
        imageUrls,
        orderAction: structuredReply.orderAction,
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
    "Cuando haya interes comercial, orienta la conversacion hacia un pedido: confirma producto, cantidad, datos de contacto y modalidad de entrega o retiro.",
    "Cuando ya esten completos producto, cantidad, nombre, telefono y entrega o retiro, devolve orderAction PREPARE usando exclusivamente IDs de producto y sucursal presentes en el contexto.",
    "Nunca le pidas al cliente IDs internos de productos o sucursales, ni frases artificiales para confirmar una sucursal.",
    "Para retiro, elegi el branchId de la sucursal que coincida con su localidad. Si hay mas de una opcion posible, pregunta su zona o direccion y ofrece sucursales por nombre.",
    "La confirmacion final es natural: el sistema crea el pedido solo despues de mostrar el resumen y recibir una aceptacion explicita e inequivoca del cliente.",
    "No digas que un pedido fue creado, reservado o confirmado si el contexto no incluye una confirmacion del servidor.",
    "Usa solamente el contexto disponible cuando menciones politicas, horarios, precios, stock o datos del negocio.",
    "Selecciona imagenes solo cuando el cliente las pida o cuando sean necesarias para identificar productos.",
    "Para imageUrls usa exclusivamente URLs del catalogo incluidas en el contexto disponible; si no corresponde una imagen, devolve una lista vacia.",
    "Si falta informacion, pedila de forma concreta o deriva a un humano.",
    input.context ? `Contexto disponible:\n${input.context}` : "Contexto disponible: sin informacion cargada.",
  ].filter(Boolean).join("\n\n");
}

function parseStructuredReply(value: string): { text: string; imageUrls: string[]; orderAction: AiOrderAction } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("OPENAI_RESPONSE_INVALID");
  }

  const candidate = parsed as { text?: unknown; imageUrls?: unknown; orderAction?: unknown } | null;
  const text = typeof candidate?.text === "string" ? candidate.text.trim() : "";
  if (!text || !Array.isArray(candidate?.imageUrls) || !candidate.imageUrls.every((url) => typeof url === "string")) {
    throw new Error("OPENAI_RESPONSE_INVALID");
  }
  return {
    text,
    imageUrls: candidate.imageUrls,
    orderAction: parseOrderAction(candidate.orderAction),
  };
}

function parseOrderAction(value: unknown): AiOrderAction {
  if (value == null) return { type: "NONE" };
  const source = value as {
    type?: unknown;
    items?: unknown;
    customer?: unknown;
    fulfillment?: unknown;
    notes?: unknown;
  };
  if (source.type === "NONE") return { type: "NONE" };
  if (source.type !== "PREPARE" || !Array.isArray(source.items)) {
    throw new Error("OPENAI_RESPONSE_INVALID");
  }
  const items = source.items.map((item) => {
    const candidate = item as { productId?: unknown; quantity?: unknown };
    if (
      typeof candidate.productId !== "string"
      || !candidate.productId.trim()
      || !Number.isInteger(candidate.quantity)
      || Number(candidate.quantity) < 1
    ) {
      throw new Error("OPENAI_RESPONSE_INVALID");
    }
    return { productId: candidate.productId.trim(), quantity: Number(candidate.quantity) };
  });
  const customer = source.customer as { name?: unknown; phone?: unknown; email?: unknown } | null;
  const fulfillment = source.fulfillment as {
    type?: unknown;
    branchId?: unknown;
    address?: unknown;
  } | null;
  if (
    items.length === 0
    || typeof customer?.name !== "string"
    || !customer.name.trim()
    || typeof customer.phone !== "string"
    || !customer.phone.trim()
    || (fulfillment?.type !== "DELIVERY" && fulfillment?.type !== "PICKUP")
  ) {
    throw new Error("OPENAI_RESPONSE_INVALID");
  }
  return {
    type: "PREPARE",
    items,
    customer: {
      name: customer.name.trim(),
      phone: customer.phone.trim(),
      ...(typeof customer.email === "string" && customer.email.trim()
        ? { email: customer.email.trim() }
        : {}),
    },
    fulfillment: {
      type: fulfillment.type,
      ...(typeof fulfillment.branchId === "string" && fulfillment.branchId.trim()
        ? { branchId: fulfillment.branchId.trim() }
        : {}),
      ...(typeof fulfillment.address === "string" && fulfillment.address.trim()
        ? { address: fulfillment.address.trim() }
        : {}),
    },
    ...(typeof source.notes === "string" && source.notes.trim()
      ? { notes: source.notes.trim() }
      : {}),
  };
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

function hasRefusal(payload: unknown): boolean {
  const source = payload as {
    refusal?: unknown;
    output?: Array<{ content?: Array<{ type?: unknown; refusal?: unknown }> }>;
  } | null;
  if (typeof source?.refusal === "string" && source.refusal.trim()) return true;
  return (source?.output ?? []).some((item) =>
    (item.content ?? []).some((content) =>
      content.type === "refusal" || (typeof content.refusal === "string" && Boolean(content.refusal.trim())),
    ),
  );
}

function readUsageToken(payload: unknown, key: "input_tokens" | "output_tokens"): number {
  const value = (payload as { usage?: Record<string, unknown> } | null)?.usage?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readOpenAiError(payload: unknown): string | null {
  const message = (payload as { error?: { message?: unknown } } | null)?.error?.message;
  return typeof message === "string" && message ? message : null;
}
