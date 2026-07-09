import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../../../lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ handoffId: string }> },
) {
  const { handoffId } = await params;
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
