import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../../lib/db";
import { extractKnowledgeFile } from "../../../../../../lib/knowledge-file-extractor";
import { processKnowledgeFile } from "../../../../../../lib/knowledge-file-worker";
import { downloadKnowledgeObject } from "../../../../../../lib/knowledge-object-storage";
import { resolveLabsRequestContext } from "../../../../../../lib/request-context";

export async function POST(request: Request, { params }: { params: Promise<{ knowledgeId: string }> }) {
  const resolved = await resolveLabsRequestContext(request.headers.get("cookie"));
  const { knowledgeId } = await params;
  const item = await labsPrisma.knowledgeItem.findFirst({ where: { id: knowledgeId, assistantId: resolved.assistant.id, sourceType: "FILE" } });
  if (!item?.objectKey || !item.mimeType) return NextResponse.json({ error: "KNOWLEDGE_SOURCE_NOT_FOUND" }, { status: 404 });
  const result = await processKnowledgeFile({ id: item.id, objectKey: item.objectKey, mimeType: item.mimeType }, {
    download: downloadKnowledgeObject, extract: extractKnowledgeFile,
    update: async (id, data) => { await labsPrisma.knowledgeItem.update({ where: { id }, data: data.status === "READY" ? { status: data.status, extractedText: data.text, content: data.text, processingError: null } : { status: data.status, processingError: data.error } }); },
  });
  return NextResponse.json(result, { status: result.status === "READY" ? 200 : 422 });
}
