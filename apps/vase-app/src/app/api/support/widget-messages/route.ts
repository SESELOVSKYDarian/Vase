import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { getTenantMembership } from "@/lib/tenancy/resolve-tenant";

const querySchema = z.object({
  conversationId: z.string().trim().min(1),
});

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const membership = await getTenantMembership(session.user.id);
  if (!membership) {
    return NextResponse.json({ items: [] });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    conversationId: url.searchParams.get("conversationId"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_CONVERSATION" }, { status: 400 });
  }

  const conversation = await prisma.supportAiConversation.findFirst({
    where: {
      id: parsed.data.conversationId,
      tenantId: membership.tenantId,
      userId: session.user.id,
    },
    select: { id: true },
  });
  if (!conversation) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const items = await prisma.supportAiMessage.findMany({
    where: {
      conversationId: conversation.id,
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ items });
}

