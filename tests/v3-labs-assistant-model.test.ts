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
    const updateModel = vi.fn(async () => ({ id: "assistant_1", model: "gpt-premium" }));
    const PATCH = createAssistantModelPatchHandler({
      env: { OPENAI_MODEL_PREMIUM: "gpt-premium" } as NodeJS.ProcessEnv,
      resolveContext: async () => ({ assistant: { id: "assistant_1" } }),
      updateModel,
    });

    const response = await PATCH(request({ profileId: "premium" }));

    expect(response.status).toBe(200);
    expect(updateModel).toHaveBeenCalledWith("assistant_1", "gpt-premium");
    expect(await response.json()).toMatchObject({
      assistant: { id: "assistant_1", model: "gpt-premium" },
      profile: { id: "premium", model: "gpt-premium" },
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
  it("exposes serializable ChatGPT profile options for the selector", () => {
    const profiles = getOpenAiModelProfiles({
      OPENAI_MODEL_FAST: "gpt-fast",
      OPENAI_MODEL_BALANCED: "gpt-balanced",
      OPENAI_MODEL_PREMIUM: "gpt-premium",
    } as NodeJS.ProcessEnv);

    expect(profiles).toEqual([
      expect.objectContaining({ id: "fast", label: "Rápido", model: "gpt-fast" }),
      expect.objectContaining({ id: "balanced", label: "Balanceado", model: "gpt-balanced" }),
      expect.objectContaining({ id: "premium", label: "Premium", model: "gpt-premium" }),
    ]);
    expect(resolveOpenAiModelProfile({ profileId: "fast", env: { OPENAI_MODEL_FAST: "gpt-fast" } as NodeJS.ProcessEnv }).model).toBe("gpt-fast");
  });
});
