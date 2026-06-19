import { describe, expect, it } from "vitest";
import {
  buildOpenAiBusinessContext,
  readOpenAiBusinessConfig,
  stripAiProviderSecretsFromBusinessContext,
} from "@/lib/labs/openai-config";

describe("OpenAI Labs config", () => {
  it("preserves an existing API key when the form submits an empty key", () => {
    const context = buildOpenAiBusinessContext(
      { openai: { enabled: true, apiKey: "sk-existing", model: "gpt-5.5" } },
      {
        enabled: true,
        apiKey: "",
        model: "gpt-5.4",
        clearApiKey: false,
      },
    );

    expect(readOpenAiBusinessConfig(context)).toEqual(
      expect.objectContaining({
        enabled: true,
        apiKey: "sk-existing",
        hasApiKey: true,
        model: "gpt-5.4",
      }),
    );
  });

  it("removes provider secrets from prompt business context", () => {
    const safeContext = stripAiProviderSecretsFromBusinessContext({
      company: "Vase Labs",
      openai: {
        enabled: true,
        apiKey: "sk-secret",
        model: "gpt-5.5",
      },
    });

    expect(safeContext).toEqual({ company: "Vase Labs" });
  });
});
