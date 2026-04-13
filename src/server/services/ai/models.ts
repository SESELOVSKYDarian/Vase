export type AiTask = "chat" | "transcription" | "summary";

export type TenantAiRuntimeConfig = {
  tenantId: string;
  workspaceId: string;
  displayName: string;
  tone: string;
  model: string;
  temperature: number;
  timezone: string;
  bookingEnabled: boolean;
  businessContext: Record<string, unknown>;
  systemPrompt?: string | null;
  escalation: {
    enabled: boolean;
    destination: string;
    contact?: string | null;
  };
};

export const defaultModels: Record<AiTask, string> = {
  chat: process.env.AI_MODEL || "local-knowledge-engine",
  transcription: process.env.AI_TRANSCRIPTION_MODEL || "browser-speech-recognition",
  summary: process.env.AI_SUMMARY_MODEL || process.env.AI_MODEL || "local-summary-engine",
};
