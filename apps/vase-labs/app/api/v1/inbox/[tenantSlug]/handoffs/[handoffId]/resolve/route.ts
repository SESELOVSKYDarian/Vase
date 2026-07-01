import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../../../lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ handoffId: string }> },
) {
  const { handoffId } = await params;
  const handoffs = await (labsPrisma as any).$queryRaw<Array<{ conversationId: string }>>`
    UPDATE "Handoff"
    SET status = 'RESOLVED', "resolvedAt" = ${new Date()}
    WHERE id = ${handoffId}
    RETURNING *
  `;
  const handoff = handoffs[0];

  if (handoff) {
    await (labsPrisma as any).$executeRaw`
      UPDATE "Conversation"
      SET status = 'OPEN', "escalatedToHuman" = false, "updatedAt" = ${new Date()}
      WHERE id = ${handoff.conversationId}
    `;
  }

  return NextResponse.json({ handoff: handoff ?? null });
}
