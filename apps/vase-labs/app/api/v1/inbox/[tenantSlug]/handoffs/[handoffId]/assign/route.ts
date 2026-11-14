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
  const body = await request.json().catch(() => ({}));
  const assignedTo = typeof body.assignedTo === "string" ? body.assignedTo : "";

  if (!assignedTo) {
    return NextResponse.json({ error: "ASSIGNED_TO_REQUIRED" }, { status: 400 });
  }

  const owned = await (labsPrisma as any).handoff.findFirst({
    where: { id: handoffId, conversation: { assistant: { globalTenantId: access.globalTenantId } } },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "HANDOFF_NOT_FOUND" }, { status: 404 });

  const handoff = await (labsPrisma as any).handoff.update({
    where: { id: handoffId },
    data: { status: "ASSIGNED", assignedTo: assignedTo.slice(0, 160) },
  });

  return NextResponse.json({ handoff });
}
