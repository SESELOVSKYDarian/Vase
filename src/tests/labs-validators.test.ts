import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_OPENAI_MODEL, OPENAI_SYSTEM_PROMPT_MAX_LENGTH } from "@/lib/labs/openai-config";
import { connectChannelSchema, openAiSettingsSchema } from "@/lib/validators/labs";

describe("labs validators", () => {
  it("accepts long meta access tokens for channel connections", () => {
    const result = connectChannelSchema.safeParse({
      channelType: "WHATSAPP",
      provider: "META_OFFICIAL",
      accessToken: "x".repeat(512),
      phoneNumberId: "123456789012345",
      appSecret: "secret",
      verifyToken: "verify-token",
    });

    expect(result.success).toBe(true);
  });

  it("accepts supported OpenAI models from the selector", () => {
    const result = openAiSettingsSchema.safeParse({
      openaiEnabled: true,
      openaiApiKey: "sk-test",
      openaiModel: DEFAULT_OPENAI_MODEL,
      temperature: "0.4",
      systemPrompt: "Sos el asistente comercial de Vase Labs.",
      clearOpenAiApiKey: false,
    });

    expect(result.success).toBe(true);
  });

  it("rejects unsupported OpenAI model names", () => {
    const result = openAiSettingsSchema.safeParse({
      openaiEnabled: true,
      openaiApiKey: "sk-test",
      openaiModel: "modelo-inventado",
      temperature: "0.4",
      systemPrompt: "Sos el asistente comercial de Vase Labs.",
      clearOpenAiApiKey: false,
    });

    expect(result.success).toBe(false);
  });

  it("rejects agent prompts above the configured limit", () => {
    const result = openAiSettingsSchema.safeParse({
      openaiEnabled: true,
      openaiApiKey: "sk-test",
      openaiModel: DEFAULT_OPENAI_MODEL,
      temperature: "0.4",
      systemPrompt: "x".repeat(OPENAI_SYSTEM_PROMPT_MAX_LENGTH + 1),
      clearOpenAiApiKey: false,
    });

    expect(result.success).toBe(false);
  });

  it("stores the agent prompt in a text column", () => {
    const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");

    expect(schema).toMatch(/systemPrompt\s+String\?\s+@db\.Text/);
  });
});
