import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../../lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string; conversationId: string }> },
) {
  const { tenantSlug, conversationId } = await params;
  const conversation = await (labsPrisma as any).conversation.findFirst({
    where: {
      id: conversationId,
      assistant: { tenantSlug },
    },
  });
  const messages = conversation
    ? await (labsPrisma as any).message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return NextResponse.json({ conversation: conversation ?? null, messages });
}
