import { NextResponse } from "next/server";
import { z } from "zod";
import { knowledgeRepository, type KnowledgeItemRecord } from "../../../../lib/knowledge-repository";
import { resolveLabsRequestContext } from "../../../../lib/request-context";

type KnowledgeItemRouteContext = { params: Promise<{ knowledgeId: string }> };

type KnowledgeItemDependencies = {
  resolveContext(cookieHeader: string | null): Promise<{
    context: { globalTenantId: string };
    assistant: { id: string };
  }>;
  rename(assistantId: string, knowledgeId: string, title: string): Promise<KnowledgeItemRecord>;
  delete(
    assistantId: string,
    globalTenantId: string,
    knowledgeId: string,
  ): Promise<KnowledgeItemRecord>;
};

const titleSchema = z.object({
  title: z.string().trim().min(1).max(160),
});

const authenticationErrors = new Set([
  "LABS_SESSION_REQUIRED",
  "LABS_SESSION_INVALID",
  "LABS_SESSION_EXPIRED",
]);

function errorResponse(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";
  if (message === "KNOWLEDGE_TITLE_INVALID" || message === "KNOWLEDGE_ID_INVALID") {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (authenticationErrors.has(message)) {
    return NextResponse.json({ error: message }, { status: 401 });
  }
  if (message === "LABS_TENANT_FORBIDDEN") {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  if (message === "KNOWLEDGE_SOURCE_NOT_FOUND") {
    return NextResponse.json({ error: message }, { status: 404 });
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}

async function resolveKnowledgeId(context: KnowledgeItemRouteContext) {
  const { knowledgeId } = await context.params;
  if (!knowledgeId.trim()) throw new Error("KNOWLEDGE_ID_INVALID");
  return knowledgeId;
}

export function createKnowledgeItemHandlers(dependencies: KnowledgeItemDependencies) {
  return {
    async PATCH(request: Request, context: KnowledgeItemRouteContext) {
      try {
        const resolved = await dependencies.resolveContext(request.headers.get("cookie"));
        const knowledgeId = await resolveKnowledgeId(context);
        const body: unknown = await request.json().catch(() => {
          throw new Error("KNOWLEDGE_TITLE_INVALID");
        });
        const parsed = titleSchema.safeParse(body);
        if (!parsed.success) throw new Error("KNOWLEDGE_TITLE_INVALID");
        const knowledgeItem = await dependencies.rename(
          resolved.assistant.id,
          knowledgeId,
          parsed.data.title,
        );
        return NextResponse.json({ knowledgeItem });
      } catch (error) {
        return errorResponse(error, "KNOWLEDGE_UPDATE_FAILED");
      }
    },

    async DELETE(request: Request, context: KnowledgeItemRouteContext) {
      try {
        const resolved = await dependencies.resolveContext(request.headers.get("cookie"));
        const knowledgeId = await resolveKnowledgeId(context);
        await dependencies.delete(
          resolved.assistant.id,
          resolved.context.globalTenantId,
          knowledgeId,
        );
        return NextResponse.json({ deleted: true });
      } catch (error) {
        return errorResponse(error, "KNOWLEDGE_DELETE_FAILED");
      }
    },
  };
}

const handlers = createKnowledgeItemHandlers({
  resolveContext: resolveLabsRequestContext,
  rename: knowledgeRepository.rename,
  delete: knowledgeRepository.delete,
});

export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
