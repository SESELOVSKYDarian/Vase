import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { labsPrisma } from "../../../../../../../lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string; conversationId: string }> },
) {
  const { tenantSlug, conversationId } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = typeof body.reason === "string" ? body.reason : "human requested";
  const conversation = await (labsPrisma as any).conversation.findFirst({
    where: { id: conversationId, assistant: { tenantSlug } },
    select: { id: true, handoffs: { where: { status: { in: ["PENDING", "ASSIGNED"] } }, take: 1 } },
  });
  if (!conversation) {
    return NextResponse.json({ handoff: null }, { status: 404 });
  }

  const handoff = conversation.handoffs[0] ?? await (labsPrisma as any).handoff.create({
    data: {
      id: randomUUID(),
      conversationId,
      reason,
      target: "labs",
      status: "PENDING",
      priority: "high",
      notes: JSON.stringify({ source: "manual_inbox" }),
    },
  });

  const updatedConversation = await (labsPrisma as any).conversation.update({
    where: { id: conversationId },
    data: { status: "ESCALATED", escalatedToHuman: true },
  });

  return NextResponse.json({ handoff, conversation: updatedConversation });
}
