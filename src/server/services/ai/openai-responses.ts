import { readOpenAiBusinessConfig } from "@/lib/labs/openai-config";
import { buildAssistantSystemPrompt } from "@/server/services/ai/prompts";
import type { TenantAiRuntimeConfig } from "@/server/services/ai/models";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAiResponsePayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

function extractResponseText(payload: OpenAiResponsePayload) {
  if (typeof payload.output_text === "string" && payload.output_text.trim().length) {
    return payload.output_text.trim();
  }

  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .find((text): text is string => Boolean(text?.trim()))
    ?.trim() ?? null;
}

function buildInputText(input: {
  userMessage: string;
  history?: ChatMessage[];
}) {
  const history = (input.history ?? [])
    .slice(-8)
    .map((entry) => `${entry.role}: ${entry.content}`)
    .join("\n");

  return [
    history ? `Historial reciente:\n${history}` : null,
    `Mensaje actual del cliente:\n${input.userMessage}`,
  ].filter(Boolean).join("\n\n");
}

export async function generateOpenAiResponse(input: {
  config: TenantAiRuntimeConfig;
  knowledgeText?: string;
  userMessage: string;
  history?: ChatMessage[];
}) {
  const openAiConfig = readOpenAiBusinessConfig(
    input.config.businessContext,
    input.config.model || undefined,
  );

  if (!openAiConfig.enabled || !openAiConfig.apiKey) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${openAiConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: openAiConfig.model,
        instructions: buildAssistantSystemPrompt(input.config, input.knowledgeText),
        input: buildInputText(input),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`OpenAI response failed: ${response.status} ${errorBody}`.trim());
    }

    return extractResponseText((await response.json()) as OpenAiResponsePayload);
  } finally {
    clearTimeout(timeout);
  }
}
