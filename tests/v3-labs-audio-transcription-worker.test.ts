import { describe, expect, it, vi } from "vitest";
import { processAudioTranscriptionJob } from "../apps/vase-labs/app/lib/audio-transcription-worker";

describe("Labs audio transcription worker", () => {
  it("downloads media, transcribes locally and does not register OpenAI token usage", async () => {
    const complete = vi.fn();
    const registerTokenUsage = vi.fn();
    const result = await processAudioTranscriptionJob({
      id: "job_1",
      providerMediaId: "media_1",
      mimeType: "audio/ogg",
    }, {
      downloadMedia: vi.fn(async () => Buffer.from("audio")),
      transcriber: { transcribe: vi.fn(async () => ({ text: "quiero comprar" })) },
      complete,
      fail: vi.fn(),
      registerTokenUsage,
    });

    expect(result).toEqual({ ok: true, text: "quiero comprar" });
    expect(complete).toHaveBeenCalledWith("job_1", "quiero comprar");
    expect(registerTokenUsage).not.toHaveBeenCalled();
  });
});
