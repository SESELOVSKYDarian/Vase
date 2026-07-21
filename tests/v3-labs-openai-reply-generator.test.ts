import { describe, expect, it } from "vitest";
import {
  createOpenAiReplyGenerator,
  getDefaultOpenAiModel,
  getOpenAiModelProfiles,
  resolveOpenAiModelProfile,
} from "../apps/vase-labs/app/lib/openai-reply-generator";

describe("Labs OpenAI reply generator", () => {
  it("uses the approved customer support model catalog", () => {
    expect(getOpenAiModelProfiles({} as NodeJS.ProcessEnv).map(({ id, model }) => ({ id, model }))).toEqual([
      { id: "fast", model: "gpt-5-mini" },
      { id: "everyday", model: "gpt-4o" },
      { id: "tools", model: "gpt-4.1" },
      { id: "premium", model: "gpt-5.6-sol" },
    ]);
  });

  it("resolves configurable model profiles with a fast default", () => {
    const env = {
      OPENAI_MODEL_FAST: "gpt-fast",
      OPENAI_MODEL_EVERYDAY: "gpt-everyday",
      OPENAI_MODEL_TOOLS: "gpt-tools",
      OPENAI_MODEL_PREMIUM: "gpt-premium",
    } as NodeJS.ProcessEnv;

    expect(resolveOpenAiModelProfile({ env })).toMatchObject({ id: "fast", model: "gpt-fast" });
    expect(resolveOpenAiModelProfile({ profileId: "premium", env })).toMatchObject({ id: "premium", model: "gpt-premium" });
    expect(resolveOpenAiModelProfile({ profileId: "unknown", env })).toMatchObject({ id: "fast", model: "gpt-fast" });
    expect(getDefaultOpenAiModel(env)).toBe("gpt-fast");
    expect(getOpenAiModelProfiles(env).map((profile) => profile.id)).toEqual(["fast", "everyday", "tools", "premium"]);
  });

  it("allows one default model to back every profile", () => {
    const env = { OPENAI_DEFAULT_MODEL: "gpt-shared" } as NodeJS.ProcessEnv;

    expect(getOpenAiModelProfiles(env).map((profile) => profile.model)).toEqual(["gpt-shared", "gpt-shared", "gpt-shared", "gpt-shared"]);
  });

  it("uses an explicit assistant model over profile defaults", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const generator = createOpenAiReplyGenerator({
      apiKey: "sk-test",
      model: "gpt-selected",
      env: { OPENAI_MODEL_FAST: "gpt-fast" } as NodeJS.ProcessEnv,
      fetcher: (async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), init: init ?? {} });
        return new Response(JSON.stringify({ output_text: "Listo", usage: { input_tokens: 1, output_tokens: 2 } }));
      }) as typeof fetch,
    });

    await generator.generateReply({ userText: "Hola", context: "" });

    expect(JSON.parse(String(calls[0]?.init.body))).toMatchObject({ model: "gpt-selected" });
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
      env: { OPENAI_MODEL_PROFILE: "fast" } as NodeJS.ProcessEnv,
      fetcher: (async () => {
        called = true;
        return new Response("{}");
      }) as typeof fetch,
    });

    await expect(generator.generateReply({ userText: "Hola", context: "" })).rejects.toThrow("OPENAI_API_KEY_MISSING");
    expect(called).toBe(false);
  });
});
