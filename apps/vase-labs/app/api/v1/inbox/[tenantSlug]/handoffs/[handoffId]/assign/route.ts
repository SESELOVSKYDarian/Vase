import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../../../lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ handoffId: string }> },
) {
  const { handoffId } = await params;
  const body = await request.json().catch(() => ({}));
  const assignedTo = typeof body.assignedTo === "string" ? body.assignedTo : "";

  if (!assignedTo) {
    return NextResponse.json({ error: "ASSIGNED_TO_REQUIRED" }, { status: 400 });
  }

  const handoffs = await (labsPrisma as any).$queryRaw`
    UPDATE "Handoff"
    SET status = 'ASSIGNED', "assignedTo" = ${assignedTo}
    WHERE id = ${handoffId}
    RETURNING *
  `;

  return NextResponse.json({ handoff: handoffs[0] ?? null });
}
