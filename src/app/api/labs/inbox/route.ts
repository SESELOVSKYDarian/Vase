import { NextResponse } from "next/server";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { serializeLabsInboxConversations } from "@/server/services/labs-inbox";

export const dynamic = "force-dynamic";

export async function GET() {
  const { membership } = await requireTenantRole(tenantRoles.OWNER);
  const conversations = await prisma.aiConversation.findMany({
    where: { tenantId: membership.tenantId },
    orderBy: { lastMessageAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    conversations: serializeLabsInboxConversations(conversations),
  });
}
