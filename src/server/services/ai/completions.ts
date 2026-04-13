import { buildSummaryPrompt } from "@/server/services/ai/prompts";
import type { TenantAiRuntimeConfig } from "@/server/services/ai/models";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function extractKnowledgeAnswers(knowledgeText?: string, limit = 3) {
  if (!knowledgeText) {
    return [];
  }

  const matches = Array.from(
    knowledgeText.matchAll(/Respuesta:\s*(.+?)(?=\n(?:Fuente|Categoria|Pregunta):|\n\n|$)/gms),
  )
    .map((match) => match[1]?.replace(/\s+/g, " ").trim())
    .filter(Boolean) as string[];

  return matches.slice(0, limit);
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
  const knowledgeAnswers = extractKnowledgeAnswers(input.knowledgeText);
  const prefix = tonePrefix(input.config);
  const recentAssistantReply = [...(input.history || [])]
    .reverse()
    .find((entry) => entry.role === "assistant")
    ?.content?.trim();

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

  return [
    systemPrompt,
    lastUserLine ? `Intencion principal: ${lastUserLine.replace(/^user:\s*/i, "")}` : null,
    lastAssistantLine
      ? `Ultima respuesta enviada: ${lastAssistantLine.replace(/^assistant:\s*/i, "")}`
      : null,
    `Lineas analizadas: ${lines.length}`,
  ]
    .filter(Boolean)
    .join("\n");
}
