import {
  buildSupportKnowledgeContext,
  createSupportAiResponseLog,
} from "@/server/services/support-knowledge";
import { getTenantAiRuntimeConfig } from "@/server/services/ai/tenant-ai-config";
import type { TenantAiRuntimeConfig } from "@/server/services/ai/models";

type SupportChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function getFallbackSupportConfig(): TenantAiRuntimeConfig {
  return {
    assistantDisplayName: "Vase Support AI",
    tone: "PROFESSIONAL",
    temperature: 0.2,
    businessContext: {
      area: "support",
      objective: "Responder con base en FAQs verificadas y derivar a humano cuando falte contexto.",
    },
    models: {},
    humanEscalationEnabled: true,
    escalationDestination: "EMAIL",
    escalationContact: null,
  };
}

export async function resolveSupportAiConfig(tenantId?: string) {
  if (!tenantId) {
    return getFallbackSupportConfig();
  }

  try {
    return await getTenantAiRuntimeConfig(tenantId);
  } catch {
    return getFallbackSupportConfig();
  }
}

export async function generateSupportAiReply(input: {
  message: string;
  tenantId?: string;
  requestedByUserId?: string;
  history?: SupportChatMessage[];
}) {
  await resolveSupportAiConfig(input.tenantId);
  const knowledge = await buildSupportKnowledgeContext({
    tenantId: input.tenantId,
    message: input.message,
    limit: 5,
  });

  const knowledgeBlocks = knowledge.matches.slice(0, 5).map((match) => {
    const category = match.item.category?.trim() || "general";
    return `- [${category}] ${match.item.answer}`;
  });
  const lastAssistantMessage = [...(input.history ?? [])]
    .reverse()
    .find((message) => message.role === "assistant")
    ?.content?.trim();

  const reply =
    knowledgeBlocks.length > 0
      ? [
          `Vase Support AI`,
          `Consulta: ${input.message.trim()}`,
          `Informacion util encontrada para este caso:`,
          ...knowledgeBlocks,
          "Si esto no resuelve el caso completo, conviene continuar con soporte humano.",
        ].join("\n")
      : [
          `Vase Support AI`,
          `Consulta: ${input.message.trim()}`,
          lastAssistantMessage ? `Ultimo contexto: ${lastAssistantMessage}` : null,
          "No encontre FAQs suficientes para responder con precision. Te conviene escalar este caso a una persona de soporte.",
        ]
          .filter(Boolean)
          .join("\n");

  const responseLog = await createSupportAiResponseLog({
    tenantId: input.tenantId,
    requestedByUserId: input.requestedByUserId,
    message: input.message,
    reply,
    matches: knowledge.matches,
  });

  return {
    reply,
    knowledgeItems: knowledge.items,
    knowledgeMatches: knowledge.matches,
    responseLogId: responseLog.id,
  };
}
