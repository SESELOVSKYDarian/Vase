import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";

type AssistantPromptPatchDependencies = {
  resolveContext(cookieHeader: string | null): Promise<{ assistant: { id: string } }>;
  updatePrompt(assistantId: string, systemPrompt: string | null): Promise<{ id: string; systemPrompt: string | null }>;
};

const authenticationErrors = new Set([
  "LABS_SESSION_REQUIRED",
  "LABS_SESSION_INVALID",
  "LABS_SESSION_EXPIRED",
]);

export function createAssistantPromptPatchHandler(dependencies: AssistantPromptPatchDependencies) {
  return async function PATCH(request: Request) {
    try {
      const resolved = await dependencies.resolveContext(request.headers.get("cookie"));
      const body = await request.json().catch(() => null);
      const systemPrompt = typeof body?.systemPrompt === "string" ? body.systemPrompt.trim() : "";

      if (systemPrompt.length > 4000) {
        return NextResponse.json({ error: "ASSISTANT_PROMPT_INVALID" }, { status: 400 });
      }

      const assistant = await dependencies.updatePrompt(
        resolved.assistant.id,
        systemPrompt.length > 0 ? systemPrompt : null,
      );
      return NextResponse.json({ assistant });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (authenticationErrors.has(message)) {
        return NextResponse.json({ error: message }, { status: 401 });
      }
      return NextResponse.json({ error: "ASSISTANT_PROMPT_UPDATE_FAILED" }, { status: 500 });
    }
  };
}

export const PATCH = createAssistantPromptPatchHandler({
  resolveContext: resolveLabsRequestContext,
  updatePrompt(assistantId, systemPrompt) {
    return labsPrisma.assistant.update({
      where: { id: assistantId },
      data: { systemPrompt },
      select: { id: true, systemPrompt: true },
    });
  },
});
