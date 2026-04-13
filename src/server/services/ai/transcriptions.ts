import type { TenantAiRuntimeConfig } from "@/server/services/ai/models";

export async function transcribeAudio(_buffer: Buffer, _config: TenantAiRuntimeConfig) {
  void _buffer;
  void _config;
  return "Audio recibido. La transcripcion automatica gratuita no esta disponible en este canal todavia.";
}
