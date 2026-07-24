type FetchLike = typeof fetch;

export function createAudioTranscriptionClient(input: {
  baseUrl?: string;
  token?: string;
  fetcher?: FetchLike;
  timeoutMs?: number;
} = {}) {
  const fetcher = input.fetcher ?? fetch;
  return {
    async transcribe(buffer: Buffer, mimeType: string) {
      const baseUrl = input.baseUrl?.trim() || process.env.TRANSCRIPTION_SERVICE_URL?.trim();
      const token = input.token?.trim() || process.env.TRANSCRIPTION_SERVICE_TOKEN?.trim();
      if (!baseUrl || !token) throw new Error("TRANSCRIPTION_SERVICE_UNAVAILABLE");
      const normalizedMimeType = mimeType.split(";", 1)[0]?.trim().toLowerCase() || "audio/ogg";
      const form = new FormData();
      form.set("audio", new Blob([new Uint8Array(buffer)], { type: normalizedMimeType }), "channel-audio.ogg");
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), input.timeoutMs ?? 30_000);
      try {
        const response = await fetcher(`${new URL(baseUrl).origin}/v1/transcribe`, {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
          body: form,
          signal: abortController.signal,
        });
        if (!response.ok) throw new Error("TRANSCRIPTION_SERVICE_UNAVAILABLE");
        const payload = await response.json().catch(() => null) as { text?: unknown } | null;
        if (typeof payload?.text !== "string" || !payload.text.trim()) throw new Error("TRANSCRIPTION_EMPTY");
        return { text: payload.text.trim() };
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}
