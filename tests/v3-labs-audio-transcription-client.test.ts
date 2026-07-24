import { describe, expect, it, vi } from "vitest";
import { createAudioTranscriptionClient } from "../apps/vase-labs/app/lib/audio-transcription-client";

describe("Labs OpenAI audio transcription client", () => {
  it("posts audio to OpenAI with the economical transcription model", async () => {
    let requestBody: FormData | undefined;
    const fetcher = vi.fn(async (_url, init) => {
      requestBody = init?.body as FormData;
      return Response.json({ text: "quiero comprar" });
    });
    const client = createAudioTranscriptionClient({
      apiKey: "sk-business",
      model: "gpt-4o-mini-transcribe",
      fetcher: fetcher as typeof fetch,
    });

    const result = await client.transcribe(Buffer.from("audio"), "audio/ogg");

    expect(result).toEqual({ text: "quiero comprar" });
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.openai.com/v1/audio/transcriptions",
      expect.objectContaining({
        method: "POST",
        headers: { authorization: "Bearer sk-business" },
        signal: expect.any(AbortSignal),
      }),
    );
    expect(requestBody?.get("model")).toBe("gpt-4o-mini-transcribe");
    expect(requestBody?.get("file")).toBeInstanceOf(Blob);
  });

  it("normalizes WhatsApp Opus content types before uploading", async () => {
    let uploadedType: string | undefined;
    const client = createAudioTranscriptionClient({
      apiKey: "sk-business",
      fetcher: vi.fn(async (_url, init) => {
        uploadedType = (init?.body as FormData).get("file") instanceof Blob
          ? ((init?.body as FormData).get("file") as Blob).type
          : undefined;
        return Response.json({ text: "audio entendido" });
      }) as typeof fetch,
    });

    await client.transcribe(Buffer.from("audio"), "audio/ogg; codecs=opus");

    expect(uploadedType).toBe("audio/ogg");
  });
});
