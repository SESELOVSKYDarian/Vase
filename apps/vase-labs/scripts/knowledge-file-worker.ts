import { labsPrisma } from "../app/lib/db";
import { extractKnowledgeFile } from "../app/lib/knowledge-file-extractor";
import { processKnowledgeFile } from "../app/lib/knowledge-file-worker";
import { downloadKnowledgeObject } from "../app/lib/knowledge-object-storage";

async function processNext() {
  const job = await labsPrisma.knowledgeItem.findFirst({
    where: { sourceType: "FILE", status: { in: ["QUEUED", "PROCESSING"] }, objectKey: { not: null }, mimeType: { not: null } },
    orderBy: { updatedAt: "asc" },
  });
  if (!job?.objectKey || !job.mimeType) return false;
  await processKnowledgeFile({ id: job.id, objectKey: job.objectKey, mimeType: job.mimeType }, {
    download: downloadKnowledgeObject,
    extract: extractKnowledgeFile,
    update: async (id, data) => {
      await labsPrisma.knowledgeItem.update({ where: { id }, data: data.status === "READY"
        ? { status: "READY", content: data.text, extractedText: data.text, processingError: null }
        : data.status === "PROCESSING" ? { status: "PROCESSING", processingError: null }
          : { status: "FAILED", processingError: data.error } });
    },
  });
  return true;
}

async function main() {
  while (await processNext()) undefined;
}

void main().finally(() => labsPrisma.$disconnect());
