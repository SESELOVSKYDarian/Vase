import { NextResponse } from "next/server";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { serializeLabsInboxConversations } from "@/server/services/labs-inbox";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { membership } = await requireTenantRole(tenantRoles.OWNER);
  const url = new URL(request.url);
  const conversationId = url.searchParams.get("conversationId");
  const conversations = await prisma.aiConversation.findMany({
    where: { tenantId: membership.tenantId },
    orderBy: { lastMessageAt: "desc" },
    take: 20,
  });

  if (conversationId) {
    const target = conversations.find((conversation) => conversation.id === conversationId)
      ?? (await prisma.aiConversation.findFirst({
          where: {
            id: conversationId,
            tenantId: membership.tenantId,
          },
        }));

    if (target && !conversations.some((conversation) => conversation.id === target.id)) {
      conversations.unshift(target);
    }
  }

  return NextResponse.json({
    conversations: serializeLabsInboxConversations(conversations),
  });
}
