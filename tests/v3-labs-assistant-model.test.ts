import { describe, expect, it, vi } from "vitest";
import { createAssistantModelPatchHandler } from "../apps/vase-labs/app/api/labs/assistant/model/route";
import { getOpenAiModelProfiles, resolveOpenAiModelProfile } from "../apps/vase-labs/app/lib/openai-reply-generator";

function request(body: unknown) {
  return new Request("https://labs.vase.ar/api/labs/assistant/model", {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: "labs=session" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/labs/assistant/model", () => {
  it("updates the resolved assistant to the selected OpenAI model profile", async () => {
    const updateModel = vi.fn(async () => ({ id: "assistant_1", model: "gpt-enterprise" }));
    const PATCH = createAssistantModelPatchHandler({
      env: { OPENAI_MODEL_ENTERPRISE: "gpt-enterprise" } as NodeJS.ProcessEnv,
      resolveContext: async () => ({ assistant: { id: "assistant_1" } }),
      updateModel,
    });

    const response = await PATCH(request({ profileId: "enterprise" }));

    expect(response.status).toBe(200);
    expect(updateModel).toHaveBeenCalledWith("assistant_1", "gpt-enterprise");
    expect(await response.json()).toMatchObject({
      assistant: { id: "assistant_1", model: "gpt-enterprise" },
      profile: { id: "enterprise", model: "gpt-enterprise" },
    });
  });

  it("rejects unknown profile ids before updating the assistant", async () => {
    const updateModel = vi.fn();
    const PATCH = createAssistantModelPatchHandler({
      resolveContext: async () => ({ assistant: { id: "assistant_1" } }),
      updateModel,
    });

    const response = await PATCH(request({ profileId: "legacy" }));

    expect(response.status).toBe(400);
    expect(updateModel).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "ASSISTANT_MODEL_INVALID" });
  });
});

describe("Labs OpenAI model profile metadata", () => {
  it("exposes only the three approved ChatGPT profile options for the selector", () => {
    const profiles = getOpenAiModelProfiles({
      OPENAI_MODEL_ECONOMIC: "gpt-economic",
      OPENAI_MODEL_PROFESSIONAL: "gpt-professional",
      OPENAI_MODEL_ENTERPRISE: "gpt-enterprise",
    } as NodeJS.ProcessEnv);

    expect(profiles).toEqual([
      expect.objectContaining({ id: "economic", label: "⚡ Económico", model: "gpt-economic" }),
      expect.objectContaining({ id: "professional", label: "🚀 Profesional", model: "gpt-professional" }),
      expect.objectContaining({ id: "enterprise", label: "👑 Enterprise", model: "gpt-enterprise" }),
    ]);
    expect(resolveOpenAiModelProfile({
      profileId: "economic",
      env: { OPENAI_MODEL_ECONOMIC: "gpt-economic" } as NodeJS.ProcessEnv,
    }).model).toBe("gpt-economic");
  });
});
