import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../../../../lib/request-context";

type ReactivateDependencies = {
  resolveContext(cookieHeader: string | null): Promise<{
    context: { tenantSlug: string; globalTenantId: string };
  }>;
  reactivateConversation(input: {
    conversationId: string;
    globalTenantId: string;
  }): Promise<{ conversation: unknown; resolvedHandoffs: number } | null>;
};

export function createInboxReactivateHandler(deps: ReactivateDependencies) {
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
      const result = await deps.reactivateConversation({
        conversationId,
        globalTenantId: context.globalTenantId,
      });
      if (!result) return NextResponse.json({ error: "CONVERSATION_NOT_FOUND" }, { status: 404 });
      return NextResponse.json(result);
    } catch {
      return NextResponse.json({ error: "AI_REACTIVATION_FAILED" }, { status: 500 });
    }
  };
}

export const POST = createInboxReactivateHandler({
  resolveContext: resolveLabsRequestContext,
  async reactivateConversation(input) {
    return labsPrisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.findFirst({
        where: {
          id: input.conversationId,
          assistant: { globalTenantId: input.globalTenantId },
        },
        select: { id: true },
      });
      if (!conversation) return null;
      const handoffs = await tx.handoff.updateMany({
        where: {
          conversationId: input.conversationId,
          status: { in: ["PENDING", "ASSIGNED"] },
        },
        data: { status: "RESOLVED", resolvedAt: new Date() },
      });
      const updatedConversation = await tx.conversation.update({
        where: { id: input.conversationId },
        data: { status: "OPEN", escalatedToHuman: false },
      });
      return {
        conversation: updatedConversation,
        resolvedHandoffs: handoffs.count,
      };
    });
  },
});
