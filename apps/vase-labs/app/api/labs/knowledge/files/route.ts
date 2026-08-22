import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../lib/db";
import { createKnowledgeUploadUrl } from "../../../../lib/knowledge-object-storage";
import { resolveLabsRequestContext } from "../../../../lib/request-context";

const allowed = new Set(["application/pdf", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.presentationml.presentation"]);

export async function POST(request: Request) {
  try {
    const resolved = await resolveLabsRequestContext(request.headers.get("cookie"));
    const body = await request.json();
    const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType.trim() : "";
    const fileSize = Number(body.fileSize);
    const checksum = typeof body.checksum === "string" ? body.checksum : "";
    if (!fileName || !allowed.has(mimeType) || !Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > 25_000_000 || !checksum) return NextResponse.json({ error: "KNOWLEDGE_FILE_INVALID" }, { status: 400 });
    const id = randomUUID();
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const objectKey = `${resolved.context.globalTenantId}/${id}/${safeName}`;
    await labsPrisma.knowledgeItem.create({ data: { id, assistantId: resolved.assistant.id, title: body.title?.trim() || fileName, sourceType: "FILE", content: fileName, status: "QUEUED", objectKey, mimeType, fileSize, checksum } });
    return NextResponse.json({ id, uploadUrl: await createKnowledgeUploadUrl(objectKey, mimeType) }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "KNOWLEDGE_FILE_CREATE_FAILED" }, { status: 500 }); }
}
