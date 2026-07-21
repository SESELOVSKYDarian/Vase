import { describe, expect, it } from "vitest";
import {
  createOpenAiReplyGenerator,
  getDefaultOpenAiModel,
  getOpenAiModelProfiles,
  resolveOpenAiModelProfile,
} from "../apps/vase-labs/app/lib/openai-reply-generator";

describe("Labs OpenAI reply generator", () => {
  it("resolves configurable model profiles with a balanced default", () => {
    const env = {
      OPENAI_MODEL_FAST: "gpt-fast",
      OPENAI_MODEL_BALANCED: "gpt-balanced",
      OPENAI_MODEL_PREMIUM: "gpt-premium",
    } as NodeJS.ProcessEnv;

    expect(resolveOpenAiModelProfile({ env })).toMatchObject({ id: "balanced", model: "gpt-balanced" });
    expect(resolveOpenAiModelProfile({ profileId: "premium", env })).toMatchObject({ id: "premium", model: "gpt-premium" });
    expect(resolveOpenAiModelProfile({ profileId: "unknown", env })).toMatchObject({ id: "balanced", model: "gpt-balanced" });
    expect(getDefaultOpenAiModel(env)).toBe("gpt-balanced");
    expect(getOpenAiModelProfiles(env).map((profile) => profile.id)).toEqual(["fast", "balanced", "premium"]);
  });

  it("allows one default model to back every profile", () => {
    const env = { OPENAI_DEFAULT_MODEL: "gpt-shared" } as NodeJS.ProcessEnv;

    expect(getOpenAiModelProfiles(env).map((profile) => profile.model)).toEqual(["gpt-shared", "gpt-shared", "gpt-shared"]);
  });

  it("calls the Responses API and returns text, usage and model metadata", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response(JSON.stringify({
        output_text: "Hola, te puedo ayudar.",
        usage: { input_tokens: 12, output_tokens: 7 },
      }), { status: 200 });
    };
    const generator = createOpenAiReplyGenerator({
      apiKey: "sk-test",
      profileId: "fast",
      env: { OPENAI_MODEL_FAST: "gpt-fast" } as NodeJS.ProcessEnv,
      fetcher,
    });

    const result = await generator.generateReply({
      userText: "Hola",
      context: "Horario: 9 a 18",
    });

    expect(result).toMatchObject({
      text: "Hola, te puedo ayudar.",
      inputTokens: 12,
      outputTokens: 7,
      provider: "openai",
      model: "gpt-fast",
      profile: "fast",
    });
    expect(calls[0]?.url).toBe("https://api.openai.com/v1/responses");
    expect(calls[0]?.init.headers).toMatchObject({
      Authorization: "Bearer sk-test",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(calls[0]?.init.body))).toMatchObject({
      model: "gpt-fast",
      input: "Hola",
    });
    expect(JSON.parse(String(calls[0]?.init.body)).instructions).toContain("Horario: 9 a 18");
  });

  it("fails before calling OpenAI when the API key is missing", async () => {
    let called = false;
    const generator = createOpenAiReplyGenerator({
      env: { OPENAI_MODEL_PROFILE: "balanced" } as NodeJS.ProcessEnv,
      fetcher: (async () => {
        called = true;
        return new Response("{}");
      }) as typeof fetch,
    });

    await expect(generator.generateReply({ userText: "Hola", context: "" })).rejects.toThrow("OPENAI_API_KEY_MISSING");
    expect(called).toBe(false);
  });
});
