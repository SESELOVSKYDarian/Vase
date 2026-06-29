import type { TenantAiRuntimeConfig } from "@/server/services/ai/models";
import { readOpenAiBusinessConfig } from "@/lib/labs/openai-config";

type OpenAiTranscriptionPayload = {
  text?: string;
};

const DEFAULT_TRANSCRIPTION_MODEL = process.env.AI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe";
const AUDIO_TRANSCRIPTION_FALLBACK =
  "Audio recibido. La transcripcion automatica no esta disponible en este canal todavia.";

export async function transcribeAudio(buffer: Buffer, config: TenantAiRuntimeConfig) {
  const openAiConfig = readOpenAiBusinessConfig(config.businessContext, config.model || undefined);

  if (!openAiConfig.enabled || !openAiConfig.apiKey) {
    return AUDIO_TRANSCRIPTION_FALLBACK;
  }

  const body = new FormData();
  body.append("model", DEFAULT_TRANSCRIPTION_MODEL);
  body.append("response_format", "json");
  body.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: "audio/ogg" }),
    "whatsapp-audio.ogg",
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${openAiConfig.apiKey}`,
      },
      body,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`OpenAI transcription failed: ${response.status} ${errorBody}`.trim());
    }

    const payload = (await response.json()) as OpenAiTranscriptionPayload;
    const transcript = payload.text?.trim();

    return transcript?.length ? transcript : AUDIO_TRANSCRIPTION_FALLBACK;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "OpenAI transcription failed");
    return AUDIO_TRANSCRIPTION_FALLBACK;
  } finally {
    clearTimeout(timeout);
  }
}
