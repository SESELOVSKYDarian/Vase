import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../../../lib/request-context";

function contentFrom(value: unknown) {
  const content = (value as { content?: unknown } | null)?.content;
  return typeof content === "string" ? content : null;
}

export async function GET(request: Request, { params }: { params: Promise<{ knowledgeId: string }> }) {
  const resolved = await resolveLabsRequestContext(request.headers.get("cookie"));
  const { knowledgeId } = await params;
  const item = await labsPrisma.knowledgeItem.findFirst({ where: { id: knowledgeId, assistantId: resolved.assistant.id, sourceType: "FILE" } });
  if (!item) return NextResponse.json({ error: "KNOWLEDGE_SOURCE_NOT_FOUND" }, { status: 404 });
  const [revisions, activeCorrection] = await Promise.all([
    labsPrisma.knowledgeRevision.findMany({ where: { globalTenantId: resolved.context.globalTenantId, knowledgeItemId: knowledgeId }, orderBy: { revision: "desc" } }),
    labsPrisma.knowledgeCorrection.findFirst({ where: { globalTenantId: resolved.context.globalTenantId, knowledgeItemId: knowledgeId, active: true }, select: { revisionId: true } }),
  ]);
  const proposalIds = revisions.map((revision) => revision.proposalId).filter((id): id is string => Boolean(id));
  const proposals = await labsPrisma.knowledgeChangeProposal.findMany({ where: { id: { in: proposalIds }, globalTenantId: resolved.context.globalTenantId }, select: { id: true, sourceTranscript: true, trainerPhoneId: true } });
  const proposalById = new Map(proposals.map((proposal) => [proposal.id, proposal]));
  const original = item.extractedText ?? item.content;
  return NextResponse.json({ item: { id: item.id, title: item.title }, versions: [
    { id: null, label: "Original", revision: 0, createdAt: item.createdAt, active: !activeCorrection, before: null, after: original.slice(0, 1200), instruction: null },
    ...revisions.map((revision) => { const proposal = revision.proposalId ? proposalById.get(revision.proposalId) : null; return {
      id: revision.id, label: `Versión ${revision.revision}`, revision: revision.revision, createdAt: revision.createdAt,
      active: activeCorrection?.revisionId === revision.id, before: contentFrom(revision.beforeValue)?.slice(0, 1200) ?? null,
      after: contentFrom(revision.afterValue)?.slice(0, 1200) ?? null, instruction: proposal?.sourceTranscript ?? null,
    }; }),
  ] });
}
