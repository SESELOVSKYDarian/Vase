import { afterEach, describe, expect, it, vi } from "vitest";
import { generateAssistantReply } from "@/server/services/ai/completions";
import type { TenantAiRuntimeConfig } from "@/server/services/ai/models";

function testAiConfig(overrides: Partial<TenantAiRuntimeConfig> = {}): TenantAiRuntimeConfig {
  return {
    tenantId: "tenant-1",
    workspaceId: "workspace-1",
    displayName: "Vase Labs",
    tone: "PREMIUM",
    model: "",
    temperature: 0.4,
    timezone: "America/Argentina/Buenos_Aires",
    bookingEnabled: false,
    businessContext: {},
    systemPrompt: null,
    escalation: {
      enabled: false,
      destination: "HUMAN_QUEUE",
    },
    ...overrides,
  };
}

describe("AI completions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses OpenAI Responses API when ChatGPT is enabled", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ output_text: "Hola, soy el asistente conectado a ChatGPT." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const reply = await generateAssistantReply({
      config: testAiConfig({
        businessContext: {
          openai: {
            enabled: true,
            apiKey: "sk-secret",
            model: "gpt-5.5",
          },
        },
      }),
      userMessage: "hola",
      knowledgeText: "FAQ: Que hace Vase Labs?\nRespuesta: Vase Labs crea ecommerce y agentes de IA.",
    });

    expect(reply).toBe("Hola, soy el asistente conectado a ChatGPT.");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer sk-secret",
        }),
      }),
    );
    const requestBody = String((fetchMock.mock.calls[0]?.[1] as { body?: string })?.body ?? "");
    expect(requestBody).not.toContain("sk-secret");
  });

  it("answers greetings with a concise Vase Labs welcome", async () => {
    const reply = await generateAssistantReply({
      config: testAiConfig(),
      userMessage: "hola",
      knowledgeText: [
        "Archivo: documentacion-funcional-sistema.pdf",
        "Archivo cargado: documentacion-funcional-sistema.pdf. Contenido agregado como referencia documental para el asistente. Tipo: application/pdf. Tamano: 203467 bytes.",
      ].join("\n"),
    });

    expect(reply).toContain("Hola, soy el asistente de Vase Labs");
    expect(reply).toContain("ecommerce personalizado");
    expect(reply).toContain("automatizaciones");
    expect(reply).toContain("agentes de IA");
    expect(reply).not.toContain("documentacion-funcional-sistema.pdf");
    expect(reply).not.toContain("Tamano:");
  });

  it("ignores file metadata blocks as usable knowledge", async () => {
    const reply = await generateAssistantReply({
      config: testAiConfig(),
      userMessage: "que ofrecen?",
      knowledgeText: [
        "Archivo: documentacion-funcional-sistema.pdf",
        "Archivo cargado: documentacion-funcional-sistema.pdf. Contenido agregado como referencia documental para el asistente. Tipo: application/pdf. Tamano: 203467 bytes.",
      ].join("\n"),
    });

    expect(reply).toContain("Todavia no hay conocimiento suficiente");
    expect(reply).not.toContain("documentacion-funcional-sistema.pdf");
    expect(reply).not.toContain("Tamano:");
  });

  it("uses file knowledge blocks instead of falling back to no knowledge", async () => {
    const reply = await generateAssistantReply({
      config: testAiConfig(),
      userMessage: "que ofrecen?",
      knowledgeText: [
        "Archivo: vase-labs-servicios.md",
        "Vase Labs desarrolla ecommerce personalizado, automatizaciones comerciales y agentes de IA para WhatsApp.",
      ].join("\n"),
    });

    expect(reply).toContain("Vase Labs desarrolla ecommerce personalizado");
    expect(reply).not.toContain("Todavia no hay conocimiento suficiente");
  });
});
