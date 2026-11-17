import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../../lib/db";
import { requireTenantAccess } from "../../../../../../lib/tenant-route-guard";
import { toInboxMessageView } from "../../../../../../lib/inbox-message-view";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string; conversationId: string }> },
) {
  const { tenantSlug, conversationId } = await params;
  const access = await requireTenantAccess(request, tenantSlug);
  if (!access.ok) return access.response;
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
      ...toInboxMessageView(message),
      providerMessageId: message.providerMessageId,
    })),
  });
}
