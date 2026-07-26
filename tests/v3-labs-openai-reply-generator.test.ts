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
  orderAction: unknown = {
    type: "NONE",
    items: [],
    customer: { name: "", phone: "", email: "" },
    fulfillment: { type: "DELIVERY", branchId: "", pickupLabel: "", address: "" },
    notes: "",
  },
) {
  return {
    output_text: JSON.stringify({ text, imageUrls, orderAction }),
    usage,
  };
}

describe("Labs OpenAI reply generator", () => {
  it("uses the approved customer support model catalog", () => {
    expect(getOpenAiModelProfiles({} as NodeJS.ProcessEnv).map(({ id, model }) => ({ id, model }))).toEqual([
      { id: "economic", model: "gpt-5-mini" },
      { id: "professional", model: "gpt-4.1" },
      { id: "enterprise", model: "gpt-5.6-sol" },
    ]);
  });

  it("resolves configurable model profiles with an economic default", () => {
    const env = {
      OPENAI_MODEL_ECONOMIC: "gpt-economic",
      OPENAI_MODEL_PROFESSIONAL: "gpt-professional",
      OPENAI_MODEL_ENTERPRISE: "gpt-enterprise",
    } as NodeJS.ProcessEnv;

    expect(resolveOpenAiModelProfile({ env })).toMatchObject({ id: "economic", model: "gpt-economic" });
    expect(resolveOpenAiModelProfile({ profileId: "enterprise", env })).toMatchObject({ id: "enterprise", model: "gpt-enterprise" });
    expect(resolveOpenAiModelProfile({ profileId: "unknown", env })).toMatchObject({ id: "economic", model: "gpt-economic" });
    expect(getDefaultOpenAiModel(env)).toBe("gpt-economic");
    expect(getOpenAiModelProfiles(env).map((profile) => profile.id)).toEqual(["economic", "professional", "enterprise"]);
  });

  it("allows one default model to back every profile", () => {
    const env = { OPENAI_DEFAULT_MODEL: "gpt-shared" } as NodeJS.ProcessEnv;

    expect(getOpenAiModelProfiles(env).map((profile) => profile.model)).toEqual(["gpt-shared", "gpt-shared", "gpt-shared"]);
  });

  it("uses an explicit assistant model over profile defaults", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const generator = createOpenAiReplyGenerator({
      apiKey: "sk-test",
      model: "gpt-selected",
      env: { OPENAI_MODEL_ECONOMIC: "gpt-economic" } as NodeJS.ProcessEnv,
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
            text: JSON.stringify({
              text: "Hola, te puedo ayudar.",
              imageUrls: [],
              orderAction: {
                type: "NONE",
                items: [],
                customer: { name: "", phone: "", email: "" },
                fulfillment: { type: "DELIVERY", branchId: "", pickupLabel: "", address: "" },
                notes: "",
              },
            }),
          }],
        }],
        usage: { input_tokens: 12, output_tokens: 7 },
      }), { status: 200 });
    };
    const generator = createOpenAiReplyGenerator({
      apiKey: "sk-test",
      profileId: "economic",
      env: { OPENAI_MODEL_ECONOMIC: "gpt-economic" } as NodeJS.ProcessEnv,
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
      model: "gpt-economic",
      profile: "economic",
    });
    expect(calls[0]?.url).toBe("https://api.openai.com/v1/responses");
    expect(calls[0]?.init.headers).toMatchObject({
      Authorization: "Bearer sk-test",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(calls[0]?.init.body))).toMatchObject({
      model: "gpt-economic",
      input: "Hola",
      text: {
        format: {
          type: "json_schema",
          name: "vase_catalog_reply",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["text", "imageUrls", "orderAction"],
            properties: {
              text: { type: "string" },
              imageUrls: {
                type: "array",
                items: { type: "string" },
                maxItems: 3,
              },
              orderAction: expect.objectContaining({
                type: "object",
                required: ["type", "items", "customer", "fulfillment", "notes"],
              }),
            },
          },
        },
      },
    });
    expect(JSON.parse(String(calls[0]?.init.body)).instructions).toContain("Horario: 9 a 18");
  });

  it("returns a validated PREPARE order proposal with Business product ids", async () => {
    const generator = createOpenAiReplyGenerator({
      apiKey: "sk-test",
      fetcher: (async () => new Response(JSON.stringify(structuredReply(
        "Voy a preparar el resumen.",
        [],
        { input_tokens: 12, output_tokens: 8 },
        {
          type: "PREPARE",
          items: [{ productId: "business_product_1004", quantity: 2 }],
          customer: { name: "Darian", phone: "2234390415", email: "" },
          fulfillment: {
            type: "PICKUP",
            branchId: "branch_1",
            pickupLabel: "El Teflón (Central)",
            address: "",
          },
          notes: "",
        },
      )))) as typeof fetch,
    });

    await expect(generator.generateReply({
      userText: "Quiero dos y retiro en el local",
      context: "Producto ID Business: business_product_1004",
    })).resolves.toMatchObject({
      orderAction: {
        type: "PREPARE",
        items: [{ productId: "business_product_1004", quantity: 2 }],
        customer: { name: "Darian", phone: "2234390415" },
        fulfillment: { type: "PICKUP", branchId: "branch_1" },
      },
    });
  });

  it("allows a prompt-defined pickup location when Business has no branch id", async () => {
    const generator = createOpenAiReplyGenerator({
      apiKey: "sk-test",
      fetcher: (async () => new Response(JSON.stringify(structuredReply(
        "Preparo el retiro en la sucursal indicada.",
        [],
        { input_tokens: 8, output_tokens: 6 },
        {
          type: "PREPARE",
          items: [{ productId: "product_1006", quantity: 1 }],
          customer: { name: "Darian", phone: "2234390415", email: "" },
          fulfillment: {
            type: "PICKUP",
            branchId: "",
            pickupLabel: "El Teflón (Central)",
            address: "6657 Avenida Pedro Luro, Mar del Plata",
          },
          notes: "",
        },
      )))) as typeof fetch,
    });

    await expect(generator.generateReply({
      userText: "Retiro en Mar del Plata",
      context: "El Teflón (Central): 6657 Avenida Pedro Luro, Mar del Plata",
    })).resolves.toMatchObject({
      orderAction: {
        type: "PREPARE",
        fulfillment: {
          type: "PICKUP",
          pickupLabel: "El Teflón (Central)",
          address: "6657 Avenida Pedro Luro, Mar del Plata",
        },
      },
    });
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
    expect(instructions).toContain("orienta la conversacion hacia un pedido");
    expect(instructions).toContain("no pidas otra confirmacion");
    expect(instructions).toContain("servidor cree el pedido");
    expect(instructions).toContain("Nunca le pidas al cliente IDs internos");
    expect(instructions).toContain("sucursal que coincida con su localidad");
    expect(instructions).toContain("branchId vacio");
    expect(instructions).toContain("Usa nombre y telefono ya presentes en el historial o en datos verificados del cliente");
    expect(instructions).toContain("Si el cliente escribe un telefono con errores menores pero deja digitos suficientes");
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
      env: { OPENAI_MODEL_PROFILE: "economic" } as NodeJS.ProcessEnv,
      fetcher: (async () => {
        called = true;
        return new Response("{}");
      }) as typeof fetch,
    });

    await expect(generator.generateReply({ userText: "Hola", context: "" })).rejects.toThrow("OPENAI_API_KEY_MISSING");
    expect(called).toBe(false);
  });
});
