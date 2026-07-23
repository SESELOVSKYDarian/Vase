import { describe, expect, it, vi } from "vitest";
import { createAssistantTestHandler } from "../apps/vase-labs/app/api/labs/assistant/test/route";

describe("POST /api/labs/assistant/test", () => {
  it("answers with catalog images using knowledge and tenant-scoped catalog concurrently", async () => {
    let resolveKnowledge!: (value: string) => void;
    let resolveCatalog!: (value: { context: string; allowedImageUrls: string[] }) => void;
    const knowledge = new Promise<string>((resolve) => { resolveKnowledge = resolve; });
    const catalog = new Promise<{ context: string; allowedImageUrls: string[] }>((resolve) => { resolveCatalog = resolve; });
    const buildContext = vi.fn(() => knowledge);
    const buildCatalogResources = vi.fn(() => catalog);
    const generateReply = vi.fn(async () => ({
      text: "Te muestro el producto.",
      imageUrls: ["https://cdn.vase.ar/p1.jpg"],
      inputTokens: 10,
      outputTokens: 6,
      model: "gpt-5.6-terra",
    }));
    const POST = createAssistantTestHandler({
      async resolveContext() {
        return {
          assistant: {
            id: "assistant_1",
            globalTenantId: "tenant_1",
            model: "gpt-5.6-terra",
          },
        };
      },
      async resolveApiKey() { return "sk-assistant"; },
      buildContext,
      buildCatalogResources,
      createReplyGenerator(input) {
        expect(input).toEqual({ apiKey: "sk-assistant", model: "gpt-5.6-terra" });
        return { generateReply };
      },
    });

    const responsePromise = POST(new Request("https://labs.vase.ar/api/labs/assistant/test", {
      method: "POST",
      headers: { cookie: "labs_session=ok", "content-type": "application/json" },
      body: JSON.stringify({ message: "Mostrame el producto" }),
    }));
    await vi.waitFor(() => {
      expect(buildContext).toHaveBeenCalledWith("assistant_1");
      expect(buildCatalogResources).toHaveBeenCalledWith("tenant_1");
    });
    resolveKnowledge("Horario: 9 a 18");
    resolveCatalog({
      context: "# Producto\nImagen disponible: https://cdn.vase.ar/p1.jpg",
      allowedImageUrls: ["https://cdn.vase.ar/p1.jpg"],
    });
    const response = await responsePromise;

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      reply: "Te muestro el producto.",
      imageUrls: ["https://cdn.vase.ar/p1.jpg"],
      model: "gpt-5.6-terra",
      usage: { inputTokens: 10, outputTokens: 6 },
    });
    expect(generateReply).toHaveBeenCalledWith({
      userText: "Mostrame el producto",
      context: "Horario: 9 a 18\n\n# Producto\nImagen disponible: https://cdn.vase.ar/p1.jpg",
      allowedImageUrls: ["https://cdn.vase.ar/p1.jpg"],
    });
  });

  it("rejects empty messages before calling OpenAI", async () => {
    const createReplyGenerator = vi.fn();
    const POST = createAssistantTestHandler({
      async resolveContext() {
        return { assistant: { id: "assistant_1", globalTenantId: "tenant_1", model: "gpt-5.6-terra" } };
      },
      async resolveApiKey() { return "sk-assistant"; },
      async buildContext() { return ""; },
      async buildCatalogResources() { return { context: "", allowedImageUrls: [] }; },
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
