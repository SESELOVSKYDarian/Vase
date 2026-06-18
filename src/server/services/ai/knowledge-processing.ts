import { AiKnowledgeItemType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type QueuedKnowledgeItem = {
  id: string;
  type: AiKnowledgeItemType;
  title: string;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  sourceUrl: string | null;
  contentSnippet: string | null;
};

function describeFile(item: QueuedKnowledgeItem) {
  const fileName = item.fileName || item.title;
  const details = [
    item.mimeType ? `Tipo: ${item.mimeType}` : null,
    item.fileSizeBytes ? `Tamano: ${item.fileSizeBytes} bytes` : null,
  ].filter(Boolean);

  return [
    `Archivo cargado: ${fileName}.`,
    "Contenido agregado como referencia documental para el asistente.",
    details.length > 0 ? details.join(". ") + "." : null,
  ].filter(Boolean).join(" ");
}

function describeUrl(item: QueuedKnowledgeItem) {
  return [
    `URL registrada: ${item.sourceUrl || item.title}.`,
    item.contentSnippet || "Fuente agregada como referencia para el asistente.",
  ].filter(Boolean).join(" ");
}

function buildProcessedSnippet(item: QueuedKnowledgeItem) {
  if (item.type === AiKnowledgeItemType.FILE) {
    return describeFile(item);
  }

  if (item.type === AiKnowledgeItemType.URL) {
    return describeUrl(item);
  }

  return item.contentSnippet || item.title;
}

export async function processQueuedKnowledgeItems(tenantId: string, workspaceId: string) {
  const items = await prisma.aiKnowledgeItem.findMany({
    where: {
      tenantId,
      workspaceId,
      status: "QUEUED",
    },
    select: {
      id: true,
      type: true,
      title: true,
      fileName: true,
      mimeType: true,
      fileSizeBytes: true,
      sourceUrl: true,
      contentSnippet: true,
    },
  });

  const now = new Date();

  await Promise.all(
    items.map((item) =>
      prisma.aiKnowledgeItem.update({
        where: { id: item.id },
        data: {
          status: "READY",
          contentSnippet: buildProcessedSnippet(item),
          processingNotes:
            "Procesado automaticamente como referencia. La extraccion completa de contenido PDF/OCR requiere un extractor dedicado.",
          lastProcessedAt: now,
        },
      }),
    ),
  );

  return { processed: items.length };
}
