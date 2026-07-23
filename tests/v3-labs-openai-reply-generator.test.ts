import { describe, expect, it } from "vitest";
import {
  createOpenAiReplyGenerator,
  getDefaultOpenAiModel,
  getOpenAiModelProfiles,
  resolveOpenAiModelProfile,
} from "../apps/vase-labs/app/lib/openai-reply-generator";

function structuredReply(
  text: string,
  imageUrls: string[] = [],
  usage: { input_tokens: number; output_tokens: number } = { input_tokens: 1, output_tokens: 1 },
) {
  return {
    output_text: JSON.stringify({ text, imageUrls }),
    usage,
  };
}

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
        return new Response(JSON.stringify(structuredReply("Listo", [], { input_tokens: 1, output_tokens: 2 })));
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
        output: [{
          type: "message",
          content: [{
            type: "output_text",
            text: JSON.stringify({ text: "Hola, te puedo ayudar.", imageUrls: [] }),
          }],
        }],
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
      imageUrls: [],
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
      text: {
        format: {
          type: "json_schema",
          name: "vase_catalog_reply",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["text", "imageUrls"],
            properties: {
              text: { type: "string" },
              imageUrls: {
                type: "array",
                items: { type: "string" },
                maxItems: 3,
              },
            },
          },
        },
      },
    });
    expect(JSON.parse(String(calls[0]?.init.body)).instructions).toContain("Horario: 9 a 18");
  });

  it("includes the assistant prompt before knowledge context", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const generator = createOpenAiReplyGenerator({
      apiKey: "sk-test",
      model: "gpt-selected",
      fetcher: (async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), init: init ?? {} });
        return new Response(JSON.stringify(structuredReply("Listo")));
      }) as typeof fetch,
    });

    await generator.generateReply({
      userText: "Hola",
      systemPrompt: "Sos el vendedor de Sanitarios El Teflon. Usa tono cercano.",
      context: "Horario: 9 a 18",
    });

    const instructions = JSON.parse(String(calls[0]?.init.body)).instructions;
    expect(instructions).toContain("Sos el vendedor de Sanitarios El Teflon. Usa tono cercano.");
    expect(instructions.indexOf("Sos el vendedor")).toBeLessThan(instructions.indexOf("Horario: 9 a 18"));
    expect(instructions).toContain("solo cuando el cliente las pida");
    expect(instructions).toContain("exclusivamente URLs del catalogo");
  });

  it("keeps only exact, public HTTPS allowlist matches in model order, deduplicated and limited to three", async () => {
    const generator = createOpenAiReplyGenerator({
      apiKey: "sk-test",
      fetcher: (async () => new Response(JSON.stringify(structuredReply("Te muestro el producto.", [
        "https://cdn.vase.ar/p2.jpg",
        "https://evil.example/invented.jpg",
        "https://cdn.vase.ar/p2.jpg",
        "http://cdn.vase.ar/p1.jpg",
        "https://cdn.vase.ar/p1.jpg",
        "https://cdn.vase.ar/p3.jpg",
        "https://cdn.vase.ar/p4.jpg",
        "https://localhost/local.jpg",
        "https://user:pass@cdn.vase.ar/secret.jpg",
        "https://203.0.113.1/ip.jpg",
      ])))) as typeof fetch,
    });

    await expect(generator.generateReply({
      userText: "Mostrame opciones",
      context: "Catalogo",
      allowedImageUrls: [
        "https://cdn.vase.ar/p1.jpg",
        "https://cdn.vase.ar/p2.jpg",
        "https://cdn.vase.ar/p3.jpg",
        "https://cdn.vase.ar/p4.jpg",
        "http://cdn.vase.ar/p1.jpg",
        "https://localhost/local.jpg",
        "https://user:pass@cdn.vase.ar/secret.jpg",
        "https://203.0.113.1/ip.jpg",
      ],
    })).resolves.toMatchObject({
      text: "Te muestro el producto.",
      imageUrls: [
        "https://cdn.vase.ar/p2.jpg",
        "https://cdn.vase.ar/p1.jpg",
        "https://cdn.vase.ar/p3.jpg",
      ],
    });
  });

  it("returns an empty image list when the model selects no catalog image", async () => {
    const generator = createOpenAiReplyGenerator({
      apiKey: "sk-test",
      fetcher: (async () => new Response(JSON.stringify(structuredReply("No hace falta una imagen.")))) as typeof fetch,
    });

    await expect(generator.generateReply({
      userText: "Cual es el horario?",
      context: "Horario: 9 a 18",
      allowedImageUrls: ["https://cdn.vase.ar/p1.jpg"],
    })).resolves.toMatchObject({
      text: "No hace falta una imagen.",
      imageUrls: [],
    });
  });

  it("does not retry or parse free-form output when OpenAI rejects text.format", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const error = {
      message: "Unsupported parameter: 'text.format'.",
      type: "invalid_request_error",
      param: "text.format",
      code: "unsupported_parameter",
    };
    const generator = createOpenAiReplyGenerator({
      apiKey: "sk-test",
      model: "gpt-compatible",
      fetcher: (async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), init: init ?? {} });
        return new Response(JSON.stringify({ error }), { status: 400 });
      }) as typeof fetch,
    });

    await expect(generator.generateReply({
      userText: "Hola",
      context: "Contexto",
      allowedImageUrls: ["https://cdn.vase.ar/p1.jpg"],
    })).rejects.toThrow(error.message);
    expect(calls).toHaveLength(1);
    expect(JSON.parse(String(calls[0]?.init.body))).toHaveProperty("text.format");
  });

  it.each([
    {
      name: "an unrelated 400",
      status: 400,
      error: {
        message: "Unsupported parameter: input.",
        type: "invalid_request_error",
        param: "input",
        code: "unsupported_parameter",
      },
    },
    {
      name: "a schema validation 400",
      status: 400,
      error: {
        message: "The supplied JSON schema is invalid.",
        type: "invalid_request_error",
        param: "text.format",
        code: "invalid_json_schema",
      },
    },
    {
      name: "a 401",
      status: 401,
      error: {
        message: "Unsupported parameter: text.format.",
        type: "invalid_request_error",
        param: "text.format",
        code: "unsupported_parameter",
      },
    },
    {
      name: "a 429",
      status: 429,
      error: {
        message: "Rate limit exceeded.",
        type: "rate_limit_error",
        param: "text.format",
        code: "unsupported_parameter",
      },
    },
  ])("does not retry for $name", async ({ status, error }) => {
    let calls = 0;
    const generator = createOpenAiReplyGenerator({
      apiKey: "sk-test",
      fetcher: (async () => {
        calls += 1;
        return new Response(JSON.stringify({ error }), { status });
      }) as typeof fetch,
    });

    await expect(generator.generateReply({ userText: "Hola", context: "" }))
      .rejects.toThrow(error.message);
    expect(calls).toBe(1);
  });

  it("does not retry a network failure", async () => {
    let calls = 0;
    const generator = createOpenAiReplyGenerator({
      apiKey: "sk-test",
      fetcher: (async () => {
        calls += 1;
        throw new Error("NETWORK_DOWN");
      }) as typeof fetch,
    });

    await expect(generator.generateReply({ userText: "Hola", context: "" }))
      .rejects.toThrow("NETWORK_DOWN");
    expect(calls).toBe(1);
  });

  it("rejects malformed structured output", async () => {
    let calls = 0;
    const generator = createOpenAiReplyGenerator({
      apiKey: "sk-test",
      fetcher: (async () => {
        calls += 1;
        return new Response(JSON.stringify({ output_text: "{not-json" }));
      }) as typeof fetch,
    });

    await expect(generator.generateReply({ userText: "Hola", context: "" }))
      .rejects.toThrow("OPENAI_RESPONSE_INVALID");
    expect(calls).toBe(1);
  });

  it("rejects structured output with empty reply text", async () => {
    const generator = createOpenAiReplyGenerator({
      apiKey: "sk-test",
      fetcher: (async () => new Response(JSON.stringify(structuredReply("   ")))) as typeof fetch,
    });

    await expect(generator.generateReply({ userText: "Hola", context: "" }))
      .rejects.toThrow("OPENAI_RESPONSE_INVALID");
  });

  it("rejects empty Responses API output", async () => {
    const generator = createOpenAiReplyGenerator({
      apiKey: "sk-test",
      fetcher: (async () => new Response(JSON.stringify({ output: [] }))) as typeof fetch,
    });

    await expect(generator.generateReply({ userText: "Hola", context: "" }))
      .rejects.toThrow("OPENAI_RESPONSE_EMPTY");
  });

  it("rejects a Responses API refusal explicitly", async () => {
    const generator = createOpenAiReplyGenerator({
      apiKey: "sk-test",
      fetcher: (async () => new Response(JSON.stringify({
        output: [{ content: [{ type: "refusal", refusal: "No puedo responder." }] }],
      }))) as typeof fetch,
    });

    await expect(generator.generateReply({ userText: "Hola", context: "" }))
      .rejects.toThrow("OPENAI_RESPONSE_REFUSED");
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
