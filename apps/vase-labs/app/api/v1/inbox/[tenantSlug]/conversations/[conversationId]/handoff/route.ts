import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../../../../lib/request-context";

type HandoffDependencies = {
  resolveContext(cookieHeader: string | null): Promise<{
    context: { tenantSlug: string; globalTenantId: string };
  }>;
  pauseConversation(input: {
    conversationId: string;
    globalTenantId: string;
    reason: string;
  }): Promise<{ handoff: unknown; conversation: unknown } | null>;
};

function safeOperationError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message.trim() : "";
  return /^[A-Z0-9_:-]{1,160}$/.test(message) ? message : fallback;
}

export function createInboxHandoffHandler(deps: HandoffDependencies) {
  return async function POST(
    request: Request,
    { params }: { params: Promise<{ tenantSlug: string; conversationId: string }> },
  ) {
    try {
      const { tenantSlug, conversationId } = await params;
      const { context } = await deps.resolveContext(request.headers.get("cookie"));
      if (tenantSlug !== context.tenantSlug) {
        return NextResponse.json({ error: "LABS_TENANT_FORBIDDEN" }, { status: 403 });
      }
      const body = await request.json().catch(() => ({}));
      const reason = typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : "Intervención humana solicitada desde Inbox.";
      const result = await deps.pauseConversation({
        conversationId,
        globalTenantId: context.globalTenantId,
        reason,
      });
      if (!result) return NextResponse.json({ error: "CONVERSATION_NOT_FOUND" }, { status: 404 });
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json({ error: safeOperationError(error, "HANDOFF_FAILED") }, { status: 500 });
    }
  };
}

export const POST = createInboxHandoffHandler({
  resolveContext: resolveLabsRequestContext,
  async pauseConversation(input) {
    return labsPrisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.findFirst({
        where: {
          id: input.conversationId,
          assistant: { globalTenantId: input.globalTenantId },
        },
        select: {
          id: true,
          handoffs: {
            where: { status: { in: ["PENDING", "ASSIGNED"] } },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });
      if (!conversation) return null;
      const handoff = conversation.handoffs[0] ?? await tx.handoff.create({
        data: {
          id: randomUUID(),
          conversationId: input.conversationId,
          reason: input.reason,
          target: "labs",
          status: "PENDING",
          priority: "high",
          notes: JSON.stringify({ source: "manual_inbox" }),
        },
      });
      const updatedConversation = await tx.conversation.update({
        where: { id: input.conversationId },
        data: { status: "ESCALATED", escalatedToHuman: true },
      });
      return { handoff, conversation: updatedConversation };
    });
  },
});
