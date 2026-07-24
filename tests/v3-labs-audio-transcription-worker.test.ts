import { describe, expect, it, vi } from "vitest";
import {
  createAudioTranscriptionWorker,
  processAudioTranscriptionJob,
} from "../apps/vase-labs/app/lib/audio-transcription-worker";

describe("Labs audio transcription worker", () => {
  it("downloads media, transcribes locally and does not register OpenAI token usage", async () => {
    const complete = vi.fn();
    const continueConversation = vi.fn();
    const registerTokenUsage = vi.fn();
    const result = await processAudioTranscriptionJob({
      id: "job_1",
      providerMediaId: "media_1",
      mimeType: "audio/ogg",
    }, {
      downloadMedia: vi.fn(async () => Buffer.from("audio")),
      transcriber: { transcribe: vi.fn(async () => ({ text: "quiero comprar" })) },
      continueConversation,
      complete,
      fail: vi.fn(),
      registerTokenUsage,
    });

    expect(result).toEqual({ ok: true, text: "quiero comprar" });
    expect(continueConversation).toHaveBeenCalledWith(
      expect.objectContaining({ id: "job_1", providerMediaId: "media_1" }),
      "quiero comprar",
    );
    expect(complete).toHaveBeenCalledWith("job_1", "quiero comprar");
    expect(registerTokenUsage).not.toHaveBeenCalled();
  });

  it("claims a queued audio and completes the conversation continuation", async () => {
    const complete = vi.fn();
    const fail = vi.fn();
    const continueConversation = vi.fn();
    const worker = createAudioTranscriptionWorker({
      queue: {
        claimNext: vi.fn(async () => ({
          id: "job_1",
          providerMediaId: "media_1",
          mimeType: "audio/ogg",
        })),
        complete,
        fail,
      },
      downloadMedia: vi.fn(async () => Buffer.from("audio")),
      transcriber: { transcribe: vi.fn(async () => ({ text: "necesito dos unidades" })) },
      continueConversation,
    });

    await expect(worker.processNext()).resolves.toEqual({
      status: "COMPLETED",
      jobId: "job_1",
    });
    expect(continueConversation).toHaveBeenCalledWith(
      expect.objectContaining({ id: "job_1" }),
      "necesito dos unidades",
    );
    expect(complete).toHaveBeenCalledWith("job_1", "necesito dos unidades");
    expect(fail).not.toHaveBeenCalled();
  });

  it("preserves the queue receiver when completing a claimed job", async () => {
    const queue = {
      completed: [] as string[],
      async claimNext() {
        return { id: "job_bound", providerMediaId: "media_bound" };
      },
      async complete(jobId: string) {
        this.completed.push(jobId);
      },
      async fail() {
        throw new Error("unexpected failure");
      },
    };
    const worker = createAudioTranscriptionWorker({
      queue,
      downloadMedia: vi.fn(async () => Buffer.from("audio")),
      transcriber: { transcribe: vi.fn(async () => ({ text: "hola" })) },
      continueConversation: vi.fn(),
    });

    await expect(worker.processNext()).resolves.toMatchObject({ status: "COMPLETED" });
    expect(queue.completed).toEqual(["job_bound"]);
  });
});
