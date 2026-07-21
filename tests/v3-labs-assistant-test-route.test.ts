import { describe, expect, it, vi } from "vitest";
import { createAssistantTestHandler } from "../apps/vase-labs/app/api/labs/assistant/test/route";

describe("POST /api/labs/assistant/test", () => {
  it("answers with the selected model and the assistant knowledge", async () => {
    const generateReply = vi.fn(async () => ({
      text: "Abrimos de 9 a 18.",
      inputTokens: 10,
      outputTokens: 6,
      model: "gpt-5.6-terra",
    }));
    const POST = createAssistantTestHandler({
      async resolveContext() {
        return { assistant: { id: "assistant_1", model: "gpt-5.6-terra" } };
      },
      async resolveApiKey() { return "sk-assistant"; },
      async buildContext() { return "Horario: 9 a 18"; },
      createReplyGenerator(input) {
        expect(input).toEqual({ apiKey: "sk-assistant", model: "gpt-5.6-terra" });
        return { generateReply };
      },
    });

    const response = await POST(new Request("https://labs.vase.ar/api/labs/assistant/test", {
      method: "POST",
      headers: { cookie: "labs_session=ok", "content-type": "application/json" },
      body: JSON.stringify({ message: "¿En qué horario abren?" }),
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      reply: "Abrimos de 9 a 18.",
      model: "gpt-5.6-terra",
      usage: { inputTokens: 10, outputTokens: 6 },
    });
    expect(generateReply).toHaveBeenCalledWith({
      userText: "¿En qué horario abren?",
      context: "Horario: 9 a 18",
    });
  });

  it("rejects empty messages before calling OpenAI", async () => {
    const createReplyGenerator = vi.fn();
    const POST = createAssistantTestHandler({
      async resolveContext() { return { assistant: { id: "assistant_1", model: "gpt-5.6-terra" } }; },
      async resolveApiKey() { return "sk-assistant"; },
      async buildContext() { return ""; },
      createReplyGenerator,
    });
    const response = await POST(new Request("https://labs.vase.ar/api/labs/assistant/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "   " }),
    }));

    expect(response.status).toBe(400);
    expect(createReplyGenerator).not.toHaveBeenCalled();
  });
});
