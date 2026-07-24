import { describe, expect, it, vi } from "vitest";
import { createAudioTranscriptionClient } from "../apps/vase-labs/app/lib/audio-transcription-client";

describe("Labs local audio transcription client", () => {
  it("posts audio to the private transcription service without OpenAI tokens", async () => {
    const fetcher = vi.fn(async () => Response.json({ text: "quiero comprar" }));
    const client = createAudioTranscriptionClient({
      baseUrl: "http://vase-transcription:8080",
      token: "secret",
      fetcher: fetcher as typeof fetch,
    });

    const result = await client.transcribe(Buffer.from("audio"), "audio/ogg");

    expect(result).toEqual({ text: "quiero comprar" });
    expect(fetcher).toHaveBeenCalledWith(
      "http://vase-transcription:8080/v1/transcribe",
      expect.objectContaining({
        method: "POST",
        headers: { authorization: "Bearer secret" },
        signal: expect.any(AbortSignal),
      }),
    );
  });
});
