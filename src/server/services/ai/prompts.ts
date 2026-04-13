import type { TenantAiRuntimeConfig } from "@/server/services/ai/models";

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

  const businessContext = Object.keys(config.businessContext).length
    ? `\nContexto del negocio:\n${JSON.stringify(config.businessContext, null, 2)}`
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
