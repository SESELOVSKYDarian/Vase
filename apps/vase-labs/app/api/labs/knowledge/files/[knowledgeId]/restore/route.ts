import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../../../lib/request-context";

function contentFrom(value: unknown) {
  const content = (value as { content?: unknown } | null)?.content;
  return typeof content === "string" ? content : null;
}

export async function POST(request: Request, { params }: { params: Promise<{ knowledgeId: string }> }) {
  const resolved = await resolveLabsRequestContext(request.headers.get("cookie"));
  const { knowledgeId } = await params;
  const body = await request.json().catch(() => ({})) as { revisionId?: unknown };
  const revisionId = typeof body.revisionId === "string" ? body.revisionId : null;
  const item = await labsPrisma.knowledgeItem.findFirst({ where: { id: knowledgeId, assistantId: resolved.assistant.id, sourceType: "FILE", status: "READY" } });
  if (!item) return NextResponse.json({ error: "KNOWLEDGE_SOURCE_NOT_FOUND" }, { status: 404 });
  const targetRevision = revisionId ? await labsPrisma.knowledgeRevision.findFirst({ where: { id: revisionId, knowledgeItemId: knowledgeId, globalTenantId: resolved.context.globalTenantId } }) : null;
  if (revisionId && !targetRevision) return NextResponse.json({ error: "KNOWLEDGE_REVISION_NOT_FOUND" }, { status: 404 });
  const original = item.extractedText ?? item.content;
  const targetContent = targetRevision ? contentFrom(targetRevision.afterValue) : original;
  if (!targetContent) return NextResponse.json({ error: "KNOWLEDGE_REVISION_CONTENT_MISSING" }, { status: 422 });
  const result = await labsPrisma.$transaction(async (tx) => {
    const active = await tx.knowledgeCorrection.findFirst({ where: { knowledgeItemId: knowledgeId, globalTenantId: resolved.context.globalTenantId, active: true }, orderBy: { updatedAt: "desc" } });
    const currentContent = active?.content ?? original;
    const latest = await tx.knowledgeRevision.findFirst({ where: { globalTenantId: resolved.context.globalTenantId }, orderBy: { revision: "desc" }, select: { revision: true } });
    const restoration = await tx.knowledgeRevision.create({ data: { globalTenantId: resolved.context.globalTenantId, knowledgeItemId: knowledgeId, revision: (latest?.revision ?? 0) + 1, beforeValue: { content: currentContent }, afterValue: { content: targetContent } } });
    await tx.knowledgeCorrection.updateMany({ where: { knowledgeItemId: knowledgeId, active: true }, data: { active: false } });
    if (targetContent !== original) await tx.knowledgeCorrection.create({ data: { globalTenantId: resolved.context.globalTenantId, knowledgeItemId: knowledgeId, revisionId: restoration.id, content: targetContent } });
    return restoration;
  });
  return NextResponse.json({ ok: true, revisionId: result.id });
}
