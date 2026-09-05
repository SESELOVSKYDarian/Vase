import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const search = new URL(request.url).searchParams;
  const status = search.get("status");
  const assistant = await (labsPrisma as any).assistant.findUnique({
    where: { tenantSlug },
    select: { id: true, globalTenantId: true },
  });
  const rows = assistant
    ? await (labsPrisma as any).conversation.findMany({
        where: {
          assistantId: assistant.id,
          ...(status ? { status } : {}),
        },
        orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
        take: 100,
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 80,
            include: {
              deliveries: {
                orderBy: { updatedAt: "desc" },
                take: 1,
              },
            },
          },
          handoffs: {
            where: { status: { in: ["PENDING", "ASSIGNED"] } },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      })
    : [];
  const conversations = rows.map((conversation: any) => ({
    globalTenantId: assistant?.globalTenantId ?? "",
    id: conversation.id,
    channel: conversation.channel,
    status: conversation.status,
    customerName: conversation.customerName,
    customerContact: conversation.customerContact,
    messageCount: conversation.messageCount,
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    escalatedToHuman: conversation.escalatedToHuman,
    summary: conversation.summary,
    messages: conversation.messages.map((message: any) => ({
      id: message.id,
      role: message.role,
      direction: message.direction,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      delivery: message.deliveries[0]
        ? {
            status: message.deliveries[0].status,
            providerMessageId: message.deliveries[0].providerMessageId,
            error: message.deliveries[0].error,
          }
        : null,
    })),
    handoffs: conversation.handoffs.map((handoff: any) => ({
      id: handoff.id,
      status: handoff.status,
      reason: handoff.reason,
      priority: handoff.priority,
      assignedTo: handoff.assignedTo,
    })),
  }));

  return NextResponse.json({ conversations });
}
