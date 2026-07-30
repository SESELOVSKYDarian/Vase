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
    include: {
      handoffs: {
        where: { status: { in: ["PENDING", "ASSIGNED"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  const messages = conversation
    ? await (labsPrisma as any).message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
        include: {
          deliveries: {
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
      })
    : [];

  return NextResponse.json({
    conversation: conversation ?? null,
    messages: messages.map((message: any) => ({
      id: message.id,
      role: message.role,
      direction: message.direction,
      content: message.content,
      providerMessageId: message.providerMessageId,
      createdAt: message.createdAt,
      delivery: message.deliveries[0]
        ? {
            status: message.deliveries[0].status,
            providerMessageId: message.deliveries[0].providerMessageId,
            error: message.deliveries[0].error,
          }
        : null,
    })),
  });
}
