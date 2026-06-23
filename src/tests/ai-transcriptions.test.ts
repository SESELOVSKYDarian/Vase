import { afterEach, describe, expect, it, vi } from "vitest";
import { transcribeAudio } from "@/server/services/ai/transcriptions";
import type { TenantAiRuntimeConfig } from "@/server/services/ai/models";

function testAiConfig(): TenantAiRuntimeConfig {
  return {
    tenantId: "tenant-1",
    workspaceId: "workspace-1",
    displayName: "Vase Labs",
    tone: "PROFESSIONAL",
    model: "gpt-5-nano",
    temperature: 0.4,
    timezone: "America/Argentina/Buenos_Aires",
    bookingEnabled: false,
    businessContext: {
      openai: {
        enabled: true,
        apiKey: "sk-secret",
        model: "gpt-5-nano",
      },
    },
    systemPrompt: null,
    escalation: {
      enabled: false,
      destination: "HUMAN_QUEUE",
    },
  };
}

describe("AI audio transcriptions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends inbound audio to OpenAI transcription and returns the transcript text", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ text: "Quiero saber los precios de Vase Labs." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const text = await transcribeAudio(Buffer.from("audio-data"), testAiConfig());

    expect(text).toBe("Quiero saber los precios de Vase Labs.");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.openai.com/v1/audio/transcriptions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer sk-secret",
        }),
      }),
    );
  });

  it("returns a clear fallback when OpenAI is not configured for the tenant", async () => {
    const text = await transcribeAudio(Buffer.from("audio-data"), {
      ...testAiConfig(),
      businessContext: {},
    });

    expect(text).toContain("Audio recibido");
    expect(text).toContain("transcripcion automatica");
  });
});
