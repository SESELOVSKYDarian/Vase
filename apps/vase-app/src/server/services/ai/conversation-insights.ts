import { z } from "zod";
import type { AiConversationIntentLabel } from "@prisma/client";
import { generateOpenAiStructuredResponse } from "@/server/services/ai/openai-responses";
import { buildConversationClassificationPrompt } from "@/server/services/ai/prompts";
import type { TenantAiRuntimeConfig } from "@/server/services/ai/models";
import { readConversationMetadata } from "@/server/services/chatbot/conversation-state";

export type ConversationIntentReport = {
  label: AiConversationIntentLabel;
  score: number;
  reason: string;
  nextAction: string;
  shouldEscalate: boolean;
};

const conversationIntentSchema = z.object({
  label: z.enum(["HOT_LEAD", "RESEARCHING", "LOW_INTENT", "HUMAN_REQUESTED"]),
  score: z.number().int().min(0).max(100),
  reason: z.string().trim().min(1).max(240),
  nextAction: z.string().trim().min(1).max(240),
});

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function extractConversationText(metadata: unknown, currentMessage: string) {
  const current = readConversationMetadata(metadata);
  const transcript = current.transcript
    .slice(-10)
    .map((entry) => `${entry.role}: ${entry.content}`)
    .join("\n");
  const lastTranscriptEntry = current.transcript[current.transcript.length - 1];
  const shouldAppendCurrentMessage =
    !lastTranscriptEntry ||
    `${lastTranscriptEntry.role}: ${lastTranscriptEntry.content}`.trim() !== `user: ${currentMessage}`.trim();

  return [
    transcript ? `Historial:\n${transcript}` : null,
    shouldAppendCurrentMessage && currentMessage ? `Mensaje actual:\n${currentMessage}` : null,
    current.context && Object.keys(current.context).length
      ? `Contexto:\n${JSON.stringify(current.context, null, 2)}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");
}

function classifyByRules(text: string): ConversationIntentReport {
  const normalized = normalizeText(text);
  const humanKeywords = ["humano", "asesor", "persona", "encargado", "agente", "derivar"];
  const hotLeadKeywords = [
    "cotizacion",
    "cotizar",
    "presupuesto",
    "precio",
    "precios",
    "comprar",
    "contratar",
    "demo",
    "plan",
    "facturacion",
    "llamame",
    "llamar",
    "interesado",
    "necesito",
  ];
  const researchKeywords = ["info", "informacion", "como funciona", "catalogo", "servicios", "web", "consulta"];
  const lowIntentKeywords = ["hola", "buenas", "gracias", "ok", "perfecto", "prueba", "test"];

  if (humanKeywords.some((keyword) => normalized.includes(keyword))) {
    return {
      label: "HUMAN_REQUESTED",
      score: 100,
      reason: "La persona pide ser atendida por un humano o derivada a un encargado.",
      nextAction: "Derivar a un humano y responder con contencion inmediata.",
      shouldEscalate: true,
    };
  }

  if (hotLeadKeywords.some((keyword) => normalized.includes(keyword))) {
    return {
      label: "HOT_LEAD",
      score: 85,
      reason: "Hay intencion comercial clara, consulta de precio o interes de contratacion.",
      nextAction: "Responder con propuesta comercial o paso de cierre.",
      shouldEscalate: false,
    };
  }

  if (researchKeywords.some((keyword) => normalized.includes(keyword))) {
    return {
      label: "RESEARCHING",
      score: 55,
      reason: "La persona esta comparando o pidiendo informacion previa a decidir.",
      nextAction: "Responder con informacion util y un CTA suave.",
      shouldEscalate: false,
    };
  }

  if (lowIntentKeywords.some((keyword) => normalized.includes(keyword)) || normalized.length < 20) {
    return {
      label: "LOW_INTENT",
      score: 18,
      reason: "La interaccion es muy general, de saludo o con poca señal de compra.",
      nextAction: "Ofrecer una respuesta breve y consultar si necesita informacion concreta.",
      shouldEscalate: false,
    };
  }

  return {
    label: "RESEARCHING",
    score: 45,
    reason: "La conversacion muestra consulta activa sin una señal fuerte de compra inmediata.",
    nextAction: "Acompanar con claridad y detectar si hay interes de compra.",
    shouldEscalate: false,
  };
}

function parseStructuredResponse(value: string | null) {
  if (!value) return null;

  const normalized = value.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/, "");
  const start = normalized.indexOf("{");
  const end = normalized.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) return null;

  try {
    return JSON.parse(normalized.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

export async function classifyConversationIntent(input: {
  config: TenantAiRuntimeConfig;
  metadata: unknown;
  currentMessage: string;
}) {
  const promptText = extractConversationText(input.metadata, input.currentMessage);
  const fallback = classifyByRules(promptText || input.currentMessage);

  try {
    const responseText = await generateOpenAiStructuredResponse({
      config: input.config,
      instructions: buildConversationClassificationPrompt(input.config),
      inputText: promptText,
      temperature: 0.1,
    });

    const parsed = conversationIntentSchema.safeParse(parseStructuredResponse(responseText));
    if (!parsed.success) {
      return fallback;
    }

    const normalizedLabel = parsed.data.label;
    return {
      label: normalizedLabel,
      score: parsed.data.score,
      reason: parsed.data.reason,
      nextAction: parsed.data.nextAction,
      shouldEscalate: normalizedLabel === "HUMAN_REQUESTED",
    };
  } catch {
    return fallback;
  }
}
