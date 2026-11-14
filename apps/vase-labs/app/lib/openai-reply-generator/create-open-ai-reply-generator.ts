// Parte de openai-reply-generator.ts: createOpenAiReplyGenerator, validateOpenAiCredential, buildSystemInstructions, parseStructuredReply, parseHandoff.
import { normalizePublicHttpsImageUrl } from "../public-image-url";
import { AiOrderAction, AiReplyResult, CreateOpenAiReplyGeneratorInput, FetchLike, resolveOpenAiModelProfile } from "./resolve-open-ai-model-profile";
import { extractOutputText, hasRefusal, parseOrderAction, readOpenAiError, readUsageToken } from "./parse-order-action";

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
                          pickupLabel: { type: "string" },
                          address: { type: "string" },
                        },
                        required: ["type", "branchId", "pickupLabel", "address"],
                      },
                      notes: { type: "string" },
                    },
                    required: ["type", "items", "customer", "fulfillment", "notes"],
                  },
                  handoff: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      needed: { type: "boolean" },
                      reason: { type: "string" },
                    },
                    required: ["needed", "reason"],
                  },
                },
                required: ["text", "imageUrls", "orderAction", "handoff"],
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
        ...(structuredReply.handoff.needed ? { handoff: structuredReply.handoff } : {}),
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

export function buildSystemInstructions(input: { context: string; systemPrompt?: string | null }): string {
  const customerPrompt = input.systemPrompt?.trim();
  return [
    "Sos el asistente comercial de Vase Labs para un negocio conectado por canales oficiales.",
    customerPrompt ? `Instrucciones del negocio:\n${customerPrompt}` : null,
    "Responde en el mismo idioma del cliente, con tono claro, breve y orientado a resolver.",
    "Cuando haya interes comercial, orienta la conversacion hacia un pedido: confirma producto, cantidad, datos de contacto y modalidad de entrega o retiro.",
    "Cuando ya esten completos producto, cantidad, nombre, telefono y entrega o retiro, devolve orderAction PREPARE usando exclusivamente IDs de producto y sucursal presentes en el contexto.",
    "Usa nombre y telefono ya presentes en el historial o en datos verificados del cliente; no los vuelvas a pedir si ya estan disponibles.",
    "Si el cliente escribe un telefono con errores menores pero deja digitos suficientes, normaliza los digitos y continua el pedido.",
    "Nunca le pidas al cliente IDs internos de productos o sucursales, ni frases artificiales para confirmar una sucursal.",
    "Para retiro, elegi el branchId de la sucursal que coincida con su localidad. Si hay mas de una opcion posible, pregunta su zona o direccion y ofrece sucursales por nombre.",
    "Si Business informa que no hay sucursales sincronizadas pero el negocio definio sucursales en sus instrucciones, usa branchId vacio y completa pickupLabel y address con esos datos. Esto no impide preparar el pedido.",
    "Cuando el cliente ya dio todos los datos que le pediste para comprar, no pidas otra confirmacion: devolve orderAction PREPARE para que el servidor cree el pedido.",
    "No digas que un pedido fue creado, reservado o confirmado si el contexto no incluye una confirmacion del servidor.",
    "Usa solamente el contexto disponible cuando menciones politicas, horarios, precios, stock o datos del negocio.",
    "Selecciona imagenes solo cuando el cliente las pida o cuando sean necesarias para identificar productos.",
    "Para imageUrls usa exclusivamente URLs del catalogo incluidas en el contexto disponible; si no corresponde una imagen, devolve una lista vacia.",
    "Si falta informacion, pedila de forma concreta o deriva a un humano.",
    "Cuando el cliente pida un producto, buscalo en el catalogo aunque no use el nombre exacto (sinonimos, singular o plural, medidas). Si hay uno o varios parecidos, ofrecelos por su nombre y pregunta si es eso.",
    "Pasa la charla a una persona con handoff.needed true y una razon corta (por ejemplo: 'Pide tapa de gabinete de gas y no esta en el catalogo') cuando: no encontras en el catalogo nada parecido a lo que pide, pide un presupuesto especial o precio mayorista que no esta en el contexto, tiene un reclamo, o pide hablar con una persona. En ese caso decile que ya le avisaste al equipo y que lo atienden enseguida. En cualquier otro caso devolve handoff.needed false y reason vacio.",
    input.context ? `Contexto disponible:\n${input.context}` : "Contexto disponible: sin informacion cargada.",
  ].filter(Boolean).join("\n\n");
}

export function parseStructuredReply(value: string): { text: string; imageUrls: string[]; orderAction: AiOrderAction; handoff: { needed: boolean; reason: string } } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("OPENAI_RESPONSE_INVALID");
  }

  const candidate = parsed as { text?: unknown; imageUrls?: unknown; orderAction?: unknown; handoff?: unknown } | null;
  const text = typeof candidate?.text === "string" ? candidate.text.trim() : "";
  if (!text || !Array.isArray(candidate?.imageUrls) || !candidate.imageUrls.every((url) => typeof url === "string")) {
    throw new Error("OPENAI_RESPONSE_INVALID");
  }
  return {
    text,
    imageUrls: candidate.imageUrls,
    orderAction: parseOrderAction(candidate.orderAction),
    handoff: parseHandoff(candidate.handoff),
  };
}

export function parseHandoff(value: unknown): { needed: boolean; reason: string } {
  const source = value as { needed?: unknown; reason?: unknown } | null;
  const needed = source?.needed === true;
  const reason = typeof source?.reason === "string" ? source.reason.trim().slice(0, 300) : "";
  return { needed, reason: needed ? reason || "El asistente pidió que lo atienda una persona." : "" };
}
