import { buildSummaryPrompt } from "@/server/services/ai/prompts";
import type { TenantAiRuntimeConfig } from "@/server/services/ai/models";
import { clampConversationSummary } from "@/lib/chatbot/conversation-summary";
import { generateOpenAiResponse } from "@/server/services/ai/openai-responses";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isGreeting(message: string) {
  const normalized = normalizeText(message).replace(/[!¡?¿.,]/g, "");
  return ["hola", "buenas", "buen dia", "buenos dias", "buenas tardes", "buenas noches"].includes(normalized);
}

function isFileMetadataOnly(block: string) {
  const normalized = normalizeText(block);
  return (
    normalized.includes("archivo cargado:") &&
    normalized.includes("contenido agregado como referencia documental") &&
    (normalized.includes("tipo:") || normalized.includes("tamano:"))
  );
}

function extractKnowledgeAnswers(knowledgeText?: string, limit = 3) {
  if (!knowledgeText) {
    return [];
  }

  const matches = Array.from(
    knowledgeText.matchAll(/Respuesta:\s*([\s\S]+?)(?=\n(?:Fuente|Categoria|Pregunta):|\n\n|$)/gm),
  )
    .map((match) => match[1]?.replace(/\s+/g, " ").trim())
    .filter(Boolean) as string[];

  if (matches.length > 0) {
    return matches.slice(0, limit);
  }

  return knowledgeText
    .split(/\n{2,}/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter((block) => block.length > 0 && !isFileMetadataOnly(block))
    .slice(0, limit);
}

function tonePrefix(config: TenantAiRuntimeConfig) {
  switch (String(config.tone || "").toUpperCase()) {
    case "WARM":
      return "Claro, te ayudo con eso.";
    case "FRIENDLY":
      return "Perfecto, vamos paso a paso.";
    case "CONCISE":
      return "Respuesta breve:";
    case "PREMIUM":
      return "Te comparto una respuesta clara y ordenada.";
    default:
      return "Te comparto la mejor respuesta disponible.";
  }
}

export async function generateAssistantReply(input: {
  config: TenantAiRuntimeConfig;
  knowledgeText?: string;
  userMessage: string;
  history?: ChatMessage[];
}) {
  try {
    const openAiReply = await generateOpenAiResponse(input);
    if (openAiReply) {
      return openAiReply;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "OpenAI response failed");
  }

  const knowledgeAnswers = extractKnowledgeAnswers(input.knowledgeText);
  const prefix = tonePrefix(input.config);
  const displayName = input.config.displayName?.trim() || "Vase Labs";
  const recentAssistantReply = [...(input.history || [])]
    .reverse()
    .find((entry) => entry.role === "assistant")
    ?.content?.trim();

  if (isGreeting(input.userMessage)) {
    return [
      `Hola, soy el asistente de ${displayName}.`,
      "Puedo ayudarte con ecommerce personalizado, automatizaciones comerciales, agentes de IA y atencion por WhatsApp.",
      "Contame si queres consultar por servicios, integraciones o una cotizacion.",
    ].join("\n\n");
  }

  if (knowledgeAnswers.length > 0) {
    const bullets = knowledgeAnswers.map((answer) => `- ${answer}`).join("\n");
    return [
      prefix,
      `Consulta detectada: ${input.userMessage.trim()}`,
      "Segun la informacion configurada para este tenant:",
      bullets,
      "Si necesitas mas detalle, puedo seguir con la informacion disponible o derivarte a una persona.",
    ].join("\n\n");
  }

  return [
    prefix,
    `Recibi tu mensaje: ${input.userMessage.trim()}`,
    recentAssistantReply
      ? `Ultimo contexto util de la conversacion: ${recentAssistantReply}`
      : "Todavia no hay conocimiento suficiente configurado para responder con precision.",
    "Te conviene agregar conocimiento del negocio o derivar el caso a una persona.",
  ].join("\n\n");
}

export async function summarizeConversation(input: {
  config: TenantAiRuntimeConfig;
  transcript: string;
}) {
  const lines = input.transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const lastUserLine = [...lines].reverse().find((line) => line.startsWith("user:"));
  const lastAssistantLine = [...lines].reverse().find((line) => line.startsWith("assistant:"));
  const systemPrompt = buildSummaryPrompt(input.config);

  return clampConversationSummary([
    systemPrompt,
    lastUserLine ? `Intencion principal: ${lastUserLine.replace(/^user:\s*/i, "")}` : null,
    lastAssistantLine
      ? `Ultima respuesta enviada: ${lastAssistantLine.replace(/^assistant:\s*/i, "")}`
      : null,
    `Lineas analizadas: ${lines.length}`,
  ]
    .filter(Boolean)
    .join("\n"));
}
