import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../../../../lib/request-context";

export async function POST(request: Request, { params }: { params: Promise<{ revisionId: string }> }) {
  const resolved = await resolveLabsRequestContext(request.headers.get("cookie"));
  const { revisionId } = await params;
  const result = await labsPrisma.$transaction(async (tx) => {
    const revision = await tx.knowledgeRevision.findFirst({ where: { id: revisionId, globalTenantId: resolved.context.globalTenantId } });
    if (!revision) return { error: "KNOWLEDGE_REVISION_NOT_FOUND" as const };
    if (revision.revertedAt) return { error: "KNOWLEDGE_REVISION_ALREADY_REVERTED" as const };
    const correction = await tx.knowledgeCorrection.findFirst({ where: { revisionId: revision.id, globalTenantId: resolved.context.globalTenantId, active: true } });
    if (correction) {
      await tx.knowledgeCorrection.update({ where: { id: correction.id }, data: { active: false } });
    } else if (revision.knowledgeItemId) {
      const before = revision.beforeValue as { question?: string; content?: string } | null;
      if (before?.question && before.content) {
        await tx.knowledgeItem.update({ where: { id: revision.knowledgeItemId }, data: { title: before.question, content: before.content } });
      } else {
        await tx.knowledgeItem.delete({ where: { id: revision.knowledgeItemId } });
      }
    }
    const latest = await tx.knowledgeRevision.findFirst({ where: { globalTenantId: resolved.context.globalTenantId }, orderBy: { revision: "desc" }, select: { revision: true } });
    const now = new Date();
    const revertedValue = JSON.parse(JSON.stringify(revision.afterValue ?? { action: "removed" }));
    const reversalValue = JSON.parse(JSON.stringify(revision.beforeValue ?? { action: "removed" }));
    await tx.knowledgeRevision.update({ where: { id: revision.id }, data: { revertedAt: now } });
    await tx.knowledgeRevision.create({ data: {
      globalTenantId: resolved.context.globalTenantId,
      knowledgeItemId: revision.knowledgeItemId,
      revision: (latest?.revision ?? 0) + 1,
      beforeValue: revertedValue,
      afterValue: reversalValue,
    } });
    return { ok: true as const };
  });
  if ("error" in result) return NextResponse.json(result, { status: result.error === "KNOWLEDGE_REVISION_NOT_FOUND" ? 404 : 409 });
  return NextResponse.json(result);
}
