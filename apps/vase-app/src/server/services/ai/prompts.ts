import type { TenantAiRuntimeConfig } from "@/server/services/ai/models";
import { stripAiProviderSecretsFromBusinessContext } from "@/lib/labs/openai-config";

function toneInstruction(tone: string) {
  switch (tone) {
    case "WARM":
      return "Responde con cercania, claridad y calidez.";
    case "CONCISE":
      return "Responde con brevedad y foco en la accion.";
    case "PREMIUM":
      return "Responde con tono premium, seguro y bien estructurado.";
    case "FRIENDLY":
      return "Responde amigablemente, manteniendo profesionalismo.";
    default:
      return "Responde con profesionalismo y claridad.";
  }
}

export function buildAssistantSystemPrompt(config: TenantAiRuntimeConfig, knowledgeText?: string) {
  const basePrompt =
    config.systemPrompt ||
    [
      `Eres ${config.displayName}, el asistente digital configurado para este tenant dentro de Vase.`,
      toneInstruction(config.tone),
      "Solo debes responder con informacion vinculada al negocio, sus procesos y sus canales activos.",
      "Si faltan datos, pide la minima aclaracion necesaria.",
      config.bookingEnabled
        ? "Este tenant tiene flujos de reservas/agenda habilitados."
        : "Este tenant no tiene reservas habilitadas salvo que la configuracion lo indique.",
    ].join("\n");

  const safeBusinessContext = stripAiProviderSecretsFromBusinessContext(config.businessContext);
  const businessContext = Object.keys(safeBusinessContext).length
    ? `\nContexto del negocio:\n${JSON.stringify(safeBusinessContext, null, 2)}`
    : "";

  const knowledge = knowledgeText ? `\nConocimiento disponible:\n${knowledgeText}` : "";

  return `${basePrompt}${businessContext}${knowledge}`.trim();
}

export function buildSummaryPrompt(config: TenantAiRuntimeConfig) {
  return [
    `Resume la conversacion para el tenant ${config.tenantId}.`,
    "Extrae intencion principal, estado, datos del cliente y proximo paso recomendado.",
    "Devuelve texto breve y accionable en espanol.",
  ].join("\n");
}

export function buildConversationClassificationPrompt(config: TenantAiRuntimeConfig) {
  return [
    `Clasifica la intencion de la conversacion del tenant ${config.tenantId}.`,
    "Debes devolver solamente JSON valido con esta forma exacta:",
    '{"label":"HOT_LEAD|RESEARCHING|LOW_INTENT|HUMAN_REQUESTED","score":0,"reason":"...","nextAction":"..."}',
    "label representa la oportunidad comercial o necesidad de derivacion.",
    "score es un entero de 0 a 100.",
    "reason explica en una frase breve por que elegiste la etiqueta.",
    "nextAction describe el siguiente paso recomendado para el equipo.",
    "Usa HUMAN_REQUESTED solo si la persona pide hablar con un humano o derivar la conversacion.",
    "Usa HOT_LEAD cuando exista clara intencion de compra, cotizacion o contratacion.",
    "Usa RESEARCHING cuando la persona compara, pregunta o pide mas informacion sin urgencia de compra.",
    "Usa LOW_INTENT cuando solo busca informacion general, saludos o consultas muy lejanas a conversion.",
  ].join("\n");
}
