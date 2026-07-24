export type AudioJob = {
  id: string;
  providerMediaId: string;
  mimeType?: string | null;
};

type AudioQueue = {
  claimNext(): Promise<AudioJob | null>;
  complete(jobId: string, transcript: string): Promise<void> | void;
  fail(jobId: string, error: string): Promise<void> | void;
};

type WorkerDeps = {
  downloadMedia(providerMediaId: string): Promise<Buffer>;
  transcriber: { transcribe(buffer: Buffer, mimeType: string): Promise<{ text: string }> };
  storeTranscript?(jobId: string, transcript: string): Promise<void> | void;
  continueConversation?(job: AudioJob, transcript: string): Promise<void> | void;
  complete(jobId: string, transcript: string): Promise<void> | void;
  fail(jobId: string, error: string): Promise<void> | void;
  registerTokenUsage?: (...args: unknown[]) => Promise<unknown> | unknown;
};

export async function processAudioTranscriptionJob(job: AudioJob, deps: WorkerDeps) {
  try {
    const buffer = await deps.downloadMedia(job.providerMediaId);
    const result = await deps.transcriber.transcribe(buffer, job.mimeType || "audio/ogg");
    await deps.storeTranscript?.(job.id, result.text);
    await deps.continueConversation?.(job, result.text);
    await deps.complete(job.id, result.text);
    return { ok: true as const, text: result.text };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AUDIO_TRANSCRIPTION_FAILED";
    await deps.fail(job.id, message);
    return { ok: false as const, error: message };
  }
}

export function createAudioTranscriptionWorker(input: {
  queue: AudioQueue;
  downloadMedia(job: AudioJob): Promise<Buffer>;
  transcriber: WorkerDeps["transcriber"];
  storeTranscript?(jobId: string, transcript: string): Promise<void> | void;
  continueConversation(job: AudioJob, transcript: string): Promise<void> | void;
}) {
  return {
    async processNext() {
      const job = await input.queue.claimNext();
      if (!job) return { status: "IDLE" as const };

      const result = await processAudioTranscriptionJob(job, {
        downloadMedia: () => input.downloadMedia(job),
        transcriber: input.transcriber,
        storeTranscript: input.storeTranscript,
        continueConversation: input.continueConversation,
        complete: (jobId, transcript) => input.queue.complete(jobId, transcript),
        fail: (jobId, error) => input.queue.fail(jobId, error),
      });
      return result.ok
        ? { status: "COMPLETED" as const, jobId: job.id }
        : { status: "FAILED" as const, jobId: job.id, error: result.error };
    },
  };
}
