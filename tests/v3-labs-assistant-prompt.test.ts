import { describe, expect, it, vi } from "vitest";
import { createAssistantPromptPatchHandler } from "../apps/vase-labs/app/api/labs/assistant/prompt/route";

function request(body: unknown) {
  return new Request("https://labs.vase.ar/api/labs/assistant/prompt", {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: "labs=session" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/labs/assistant/prompt", () => {
  it("updates only the resolved assistant prompt", async () => {
    const updatePrompt = vi.fn(async () => ({
      id: "assistant_1",
      systemPrompt: "Responde con tono comercial y breve.",
    }));
    const PATCH = createAssistantPromptPatchHandler({
      resolveContext: async () => ({ assistant: { id: "assistant_1" } }),
      updatePrompt,
    });

    const response = await PATCH(request({
      assistantId: "assistant_attacker",
      systemPrompt: "Responde con tono comercial y breve.",
    }));

    expect(response.status).toBe(200);
    expect(updatePrompt).toHaveBeenCalledWith("assistant_1", "Responde con tono comercial y breve.");
    expect(await response.json()).toEqual({
      assistant: {
        id: "assistant_1",
        systemPrompt: "Responde con tono comercial y breve.",
      },
    });
  });

  it("rejects oversized prompts before updating the assistant", async () => {
    const updatePrompt = vi.fn();
    const PATCH = createAssistantPromptPatchHandler({
      resolveContext: async () => ({ assistant: { id: "assistant_1" } }),
      updatePrompt,
    });

    const response = await PATCH(request({ systemPrompt: "x".repeat(4001) }));

    expect(response.status).toBe(400);
    expect(updatePrompt).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({ error: "ASSISTANT_PROMPT_INVALID" });
  });
});
