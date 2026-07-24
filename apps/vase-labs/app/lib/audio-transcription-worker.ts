type AudioJob = {
  id: string;
  providerMediaId: string;
  mimeType?: string | null;
};

type WorkerDeps = {
  downloadMedia(providerMediaId: string): Promise<Buffer>;
  transcriber: { transcribe(buffer: Buffer, mimeType: string): Promise<{ text: string }> };
  complete(jobId: string, transcript: string): Promise<void> | void;
  fail(jobId: string, error: string): Promise<void> | void;
  registerTokenUsage?: (...args: unknown[]) => Promise<unknown> | unknown;
};

export async function processAudioTranscriptionJob(job: AudioJob, deps: WorkerDeps) {
  try {
    const buffer = await deps.downloadMedia(job.providerMediaId);
    const result = await deps.transcriber.transcribe(buffer, job.mimeType || "audio/ogg");
    await deps.complete(job.id, result.text);
    return { ok: true as const, text: result.text };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AUDIO_TRANSCRIPTION_FAILED";
    await deps.fail(job.id, message);
    return { ok: false as const, error: message };
  }
}
