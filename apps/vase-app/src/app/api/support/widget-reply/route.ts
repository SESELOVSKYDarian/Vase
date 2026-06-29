import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { sanitizeText } from "@/lib/security/sanitize";
import { getTenantMembership } from "@/lib/tenancy/resolve-tenant";
import { prisma } from "@/lib/db/prisma";
import { generateSupportAiReply } from "@/server/services/support-ai";

const bodySchema = z.object({
  message: z.string().trim().min(2).max(1000),
  conversationId: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse({
    message: sanitizeText(String(json?.message ?? "")),
    conversationId: String(json?.conversationId ?? ""),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Mensaje invalido." }, { status: 400 });
  }

  const membership = await getTenantMembership(session.user.id);
  if (!membership) {
    return NextResponse.json({ error: "TENANT_REQUIRED" }, { status: 400 });
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
    return NextResponse.json({ error: "CONVERSATION_NOT_FOUND" }, { status: 404 });
  }

  const priorMessages = await prisma.supportAiMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 16,
    select: {
      role: true,
      content: true,
    },
  });

  const response = await generateSupportAiReply({
    message: parsed.data.message,
    tenantId: membership.tenantId,
    requestedByUserId: session.user.id,
    history: priorMessages.map((item: { role: "USER" | "ASSISTANT"; content: string }) => ({
      role: item.role === "USER" ? "user" : "assistant",
      content: item.content,
    })),
  });

  await prisma.$transaction([
    prisma.supportAiMessage.create({
      data: {
        tenantId: membership.tenantId,
        conversationId: conversation.id,
        userId: session.user.id,
        role: "USER",
        content: parsed.data.message,
      },
    }),
    prisma.supportAiMessage.create({
      data: {
        tenantId: membership.tenantId,
        conversationId: conversation.id,
        userId: session.user.id,
        role: "ASSISTANT",
        content: response.reply,
      },
    }),
    prisma.supportAiConversation.update({
      where: { id: conversation.id },
      data: {
        title: parsed.data.message.slice(0, 60),
        updatedAt: new Date(),
      },
    }),
  ]);

  return NextResponse.json({
    reply: response.reply,
    evidenceCount: response.knowledgeItems.length,
    incidentCount: response.incidentNotices.length,
  });
}
