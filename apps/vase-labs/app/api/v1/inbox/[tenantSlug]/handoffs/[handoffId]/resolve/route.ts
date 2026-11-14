import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../../../lib/db";
import { requireTenantAccess } from "../../../../../../../lib/tenant-route-guard";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string; handoffId: string }> },
) {
  const { tenantSlug, handoffId } = await params;
  const access = await requireTenantAccess(request, tenantSlug);
  if (!access.ok) return access.response;
  const owned = await (labsPrisma as any).handoff.findFirst({
    where: { id: handoffId, conversation: { assistant: { globalTenantId: access.globalTenantId } } },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "HANDOFF_NOT_FOUND" }, { status: 404 });
  const handoff = await (labsPrisma as any).handoff.update({
    where: { id: handoffId },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });

  if (handoff) {
    await (labsPrisma as any).conversation.update({
      where: { id: handoff.conversationId },
      data: { status: "OPEN", escalatedToHuman: false },
    });
  }

  return NextResponse.json({ handoff: handoff ?? null });
}
