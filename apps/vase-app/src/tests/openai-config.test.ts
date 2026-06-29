import { describe, expect, it } from "vitest";
import {
  buildOpenAiBusinessContext,
  DEFAULT_OPENAI_MODEL,
  isSupportedOpenAiModel,
  OPENAI_MODEL_OPTIONS,
  readOpenAiBusinessConfig,
  stripAiProviderSecretsFromBusinessContext,
} from "@/lib/labs/openai-config";

describe("OpenAI Labs config", () => {
  it("uses nano as the default model to control token costs", () => {
    expect(DEFAULT_OPENAI_MODEL).toBe("gpt-5-nano");
  });

  it("coerces a Start workspace back to nano when a premium model is submitted", () => {
    const context = buildOpenAiBusinessContext(
      { openai: { enabled: true, apiKey: "sk-existing", model: DEFAULT_OPENAI_MODEL } },
      {
        enabled: true,
        apiKey: "",
        model: "gpt-5.5",
        clearApiKey: false,
      },
    );

    expect(readOpenAiBusinessConfig(context)).toEqual(
      expect.objectContaining({
        model: DEFAULT_OPENAI_MODEL,
      }),
    );
  });

  it("preserves an existing API key when the form submits an empty key", () => {
    const context = buildOpenAiBusinessContext(
      { openai: { enabled: true, apiKey: "sk-existing", model: DEFAULT_OPENAI_MODEL } },
      {
        enabled: true,
        apiKey: "",
        model: DEFAULT_OPENAI_MODEL,
        clearApiKey: false,
      },
    );

    expect(readOpenAiBusinessConfig(context)).toEqual(
      expect.objectContaining({
        enabled: true,
        apiKey: "sk-existing",
        hasApiKey: true,
        model: DEFAULT_OPENAI_MODEL,
      }),
    );
  });

  it("removes provider secrets from prompt business context", () => {
    const safeContext = stripAiProviderSecretsFromBusinessContext({
      company: "Vase Labs",
      openai: {
        enabled: true,
        apiKey: "sk-secret",
        model: DEFAULT_OPENAI_MODEL,
      },
    });

    expect(safeContext).toEqual({ company: "Vase Labs" });
  });

  it("does not serialize an undefined API key into Prisma JSON", () => {
    const context = buildOpenAiBusinessContext(
      { company: "Vase Labs" },
      {
        enabled: false,
        apiKey: "",
        model: DEFAULT_OPENAI_MODEL,
        clearApiKey: false,
      },
    );

    expect(context.openai).toEqual(
      expect.objectContaining({
        enabled: false,
        hasApiKey: false,
        model: DEFAULT_OPENAI_MODEL,
      }),
    );
    expect(context.openai).not.toHaveProperty("apiKey");
  });

  it("exposes supported OpenAI model options for the selector", () => {
    expect(OPENAI_MODEL_OPTIONS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: DEFAULT_OPENAI_MODEL }),
        expect.objectContaining({ value: "gpt-5.4-mini", requiresPaidPlan: true }),
      ]),
    );
    expect(isSupportedOpenAiModel(DEFAULT_OPENAI_MODEL)).toBe(true);
    expect(isSupportedOpenAiModel("modelo-inventado")).toBe(false);
  });
});
