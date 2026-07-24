type FetchLike = typeof fetch;

export function createAudioTranscriptionClient(input: {
  apiKey: string;
  model?: string;
  fetcher?: FetchLike;
  timeoutMs?: number;
  maxBytes?: number;
}) {
  const fetcher = input.fetcher ?? fetch;
  return {
    async transcribe(buffer: Buffer, mimeType: string) {
      const apiKey = input.apiKey.trim();
      if (!apiKey) throw new Error("OPENAI_API_KEY_MISSING");
      if (buffer.byteLength > (input.maxBytes ?? 15 * 1024 * 1024)) {
        throw new Error("AUDIO_TOO_LARGE");
      }
      const normalizedMimeType = mimeType.split(";", 1)[0]?.trim().toLowerCase() || "audio/ogg";
      const form = new FormData();
      form.set("file", new Blob([new Uint8Array(buffer)], { type: normalizedMimeType }), "channel-audio.ogg");
      form.set("model", input.model?.trim() || "gpt-4o-mini-transcribe");
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), input.timeoutMs ?? 120_000);
      try {
        const response = await fetcher("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { authorization: `Bearer ${apiKey}` },
          body: form,
          signal: abortController.signal,
        });
        if (!response.ok) throw new Error("OPENAI_TRANSCRIPTION_FAILED");
        const payload = await response.json().catch(() => null) as { text?: unknown } | null;
        if (typeof payload?.text !== "string" || !payload.text.trim()) throw new Error("TRANSCRIPTION_EMPTY");
        return { text: payload.text.trim() };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
