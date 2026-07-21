import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../lib/db";
import { isOpenAiModelProfileId, resolveOpenAiModelProfile } from "../../../../lib/openai-reply-generator";
import { resolveLabsRequestContext } from "../../../../lib/request-context";

type AssistantModelPatchDependencies = {
  env?: NodeJS.ProcessEnv;
  resolveContext(cookieHeader: string | null): Promise<{ assistant: { id: string } }>;
  updateModel(assistantId: string, model: string): Promise<{ id: string; model: string }>;
};

const authenticationErrors = new Set([
  "LABS_SESSION_REQUIRED",
  "LABS_SESSION_INVALID",
  "LABS_SESSION_EXPIRED",
]);

export function createAssistantModelPatchHandler(dependencies: AssistantModelPatchDependencies) {
  return async function PATCH(request: Request) {
    try {
      const resolved = await dependencies.resolveContext(request.headers.get("cookie"));
      const body = await request.json().catch(() => null);
      const profileId = typeof body?.profileId === "string" ? body.profileId : null;

      if (!isOpenAiModelProfileId(profileId)) {
        return NextResponse.json({ error: "ASSISTANT_MODEL_INVALID" }, { status: 400 });
      }

      const profile = resolveOpenAiModelProfile({ profileId, env: dependencies.env });
      const assistant = await dependencies.updateModel(resolved.assistant.id, profile.model);
      return NextResponse.json({ assistant, profile });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (authenticationErrors.has(message)) {
        return NextResponse.json({ error: message }, { status: 401 });
      }
      return NextResponse.json({ error: "ASSISTANT_MODEL_UPDATE_FAILED" }, { status: 500 });
    }
  };
}

export const PATCH = createAssistantModelPatchHandler({
  resolveContext: resolveLabsRequestContext,
  updateModel(assistantId, model) {
    return labsPrisma.assistant.update({
      where: { id: assistantId },
      data: { model },
      select: { id: true, model: true },
    });
  },
});
