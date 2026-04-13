import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  getSupportKnowledgeItemById,
  findRelevantSupportKnowledgeItems,
  type SupportKnowledgeMatch,
} from "@/server/queries/support-knowledge";

function tagsToJson(tags: string[]) {
  return tags as Prisma.InputJsonValue;
}

export async function createSupportKnowledgeItem(input: {
  tenantId?: string;
  question: string;
  answer: string;
  category?: string;
  tags: string[];
  isActive: boolean;
  createdByUserId: string;
}) {
  return prisma.supportKnowledgeItem.create({
    data: {
      tenantId: input.tenantId,
      question: input.question,
      answer: input.answer,
      category: input.category,
      tags: tagsToJson(input.tags),
      isActive: input.isActive,
      createdByUserId: input.createdByUserId,
    },
  });
}

export async function updateSupportKnowledgeItem(input: {
  knowledgeId: string;
  tenantId?: string;
  question: string;
  answer: string;
  category?: string;
  tags: string[];
  isActive: boolean;
}) {
  return prisma.supportKnowledgeItem.update({
    where: { id: input.knowledgeId },
    data: {
      tenantId: input.tenantId,
      question: input.question,
      answer: input.answer,
      category: input.category,
      tags: tagsToJson(input.tags),
      isActive: input.isActive,
    },
  });
}

export async function deleteSupportKnowledgeItem(input: {
  knowledgeId: string;
  actorPlatformRole: "SUPER_ADMIN" | "SUPPORT";
}) {
  const item = await getSupportKnowledgeItemById(input.knowledgeId);

  if (!item) {
    throw new Error("KNOWLEDGE_NOT_FOUND");
  }

  if (!item.tenantId && input.actorPlatformRole !== "SUPER_ADMIN") {
    throw new Error("FORBIDDEN_GLOBAL_DELETE");
  }

  await prisma.supportKnowledgeItem.delete({
    where: { id: input.knowledgeId },
  });

  return item;
}

export async function buildSupportKnowledgeContext(input: {
  message: string;
  tenantId?: string;
  limit?: number;
}) {
  const matches = await findRelevantSupportKnowledgeItems({
    ...input,
    limit: Math.min(input.limit ?? 5, 5),
  });

  const groupedMatches = matches.reduce<Map<string, SupportKnowledgeMatch[]>>((groups, match) => {
    const category = match.item.category?.trim() || "general";
    const bucket = groups.get(category) ?? [];
    bucket.push(match);
    groups.set(category, bucket);
    return groups;
  }, new Map());

  const text = Array.from(groupedMatches.entries())
    .map(([category, categoryMatches]) => {
      const title = `Categoria: ${category}`;
      const entries = categoryMatches.map((match) => {
        const tags =
          Array.isArray(match.item.tags) && match.item.tags.length > 0
            ? `Etiquetas: ${match.item.tags.map((tag) => String(tag)).join(", ")}`
            : null;
        const scope = match.item.tenantId ? "Fuente tenant" : "Fuente global";

        return [
          `${scope} | Relevancia: ${match.score}`,
          tags,
          `Pregunta: ${match.item.question}`,
          `Respuesta: ${match.item.answer}`,
        ]
          .filter(Boolean)
          .join("\n");
      });

      return [title, ...entries].join("\n\n");
    })
    .join("\n\n");

  return {
    items: matches.map((match) => match.item),
    matches,
    text,
  };
}

export async function createSupportAiResponseLog(input: {
  tenantId?: string;
  requestedByUserId?: string;
  message: string;
  reply: string;
  matches: SupportKnowledgeMatch[];
}) {
  return prisma.supportAiResponseLog.create({
    data: {
      tenantId: input.tenantId,
      requestedByUserId: input.requestedByUserId,
      message: input.message,
      reply: input.reply,
      knowledgeCount: input.matches.length,
      knowledgeItems: {
        create: input.matches.map((match, index) => ({
          knowledgeItemId: match.item.id,
          relevanceScore: match.score,
          position: index + 1,
          categorySnapshot: match.item.category,
        })),
      },
    },
    include: {
      knowledgeItems: true,
    },
  });
}

export async function recordSupportAiFeedback(input: {
  responseLogId: string;
  helpful: boolean;
  feedbackNote?: string;
}) {
  return prisma.supportAiResponseLog.update({
    where: { id: input.responseLogId },
    data: {
      helpful: input.helpful,
      feedbackNote: input.feedbackNote,
      feedbackAt: new Date(),
    },
  });
}
