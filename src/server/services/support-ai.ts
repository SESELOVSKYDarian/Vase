import {
  buildSupportKnowledgeContext,
  createSupportAiResponseLog,
} from "@/server/services/support-knowledge";
import { getTenantAiRuntimeConfig } from "@/server/services/ai/tenant-ai-config";
import { prisma } from "@/lib/db/prisma";
import type { TenantAiRuntimeConfig } from "@/server/services/ai/models";

type SupportChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function getFallbackSupportConfig(): TenantAiRuntimeConfig {
  return {
    tenantId: "support-fallback",
    workspaceId: "support-fallback",
    displayName: "Vase Support AI",
    tone: "PROFESSIONAL",
    model: "local-knowledge-engine",
    temperature: 0.2,
    timezone: "America/Argentina/Buenos_Aires",
    bookingEnabled: false,
    businessContext: {
      area: "support",
      objective: "Responder con base en FAQs verificadas y derivar a humano cuando falte contexto.",
    },
    systemPrompt: null,
    escalation: {
      enabled: true,
      destination: "EMAIL",
      contact: null,
    },
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
  const incidents = await prisma.adminNotification
    .findMany({
      where: {
        isActive: true,
        tone: { in: ["warning", "danger"] },
        OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
        AND: [
          {
            OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
          },
          {
            OR: [
              { target: "ALL" },
              ...(input.tenantId ? [{ target: "TENANT" as const, tenantId: input.tenantId }] : []),
              { target: "USERS" },
            ],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        title: true,
        message: true,
        tone: true,
      },
    })
    .catch(() => []);
  const wikiMatches = input.message
    ? await prisma.wikiSection.findMany({
        where: {
          document: {
            status: "PUBLISHED",
            isPublic: true,
          },
          OR: [
            { title: { contains: input.message } },
            { body: { contains: input.message } },
          ],
        },
        take: 3,
        select: {
          title: true,
          body: true,
          document: {
            select: {
              title: true,
              slug: true,
            },
          },
        },
      })
    : [];

  const knowledgeBlocks = knowledge.matches.slice(0, 5).map((match) => {
    const category = match.item.category?.trim() || "general";
    return `- [${category}] ${match.item.answer}`;
  });
  const lastAssistantMessage = [...(input.history ?? [])]
    .reverse()
    .find((message) => message.role === "assistant")
    ?.content?.trim();

  const wikiBlocks = wikiMatches.map((wiki) => {
    const shortBody = wiki.body.slice(0, 260);
    return `- [Wiki: ${wiki.document.title}] ${wiki.title}: ${shortBody}${wiki.body.length > 260 ? "..." : ""}`;
  });

  const reply =
    incidents.length > 0 || knowledgeBlocks.length > 0 || wikiBlocks.length > 0
      ? [
          "Vase Support AI (modo gratuito con RAG interno)",
          `Consulta: ${input.message.trim()}`,
          incidents.length > 0 ? `Incidentes activos detectados:` : null,
          ...incidents.map((item) => `- ${item.title}: ${item.message}`),
          knowledgeBlocks.length > 0 ? "FAQs relevantes:" : null,
          ...knowledgeBlocks,
          wikiBlocks.length > 0 ? "Wikis relevantes:" : null,
          ...wikiBlocks,
          "Respuesta acotada al conocimiento de Vase. Si necesitas mas detalle, escala a soporte humano.",
        ]
          .filter(Boolean)
          .join("\n")
      : [
          "Vase Support AI (modo gratuito con RAG interno)",
          `Consulta: ${input.message.trim()}`,
          lastAssistantMessage ? `Ultimo contexto: ${lastAssistantMessage}` : null,
          "No encontre evidencia suficiente en FAQs/Wiki/incidentes para responder con precision.",
          "Te recomiendo abrir ticket humano para continuar.",
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
    incidentNotices: incidents,
  };
}
