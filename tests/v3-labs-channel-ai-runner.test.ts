import { describe, expect, it, vi } from "vitest";
import {
  createChannelAiReplyRunner,
  persistPrismaAssistantReply,
} from "../apps/vase-labs/app/lib/channel-ai-runner";

describe("channel AI reply runner", () => {
  it("uses the Labs OpenAI key and selected assistant model to reply through the channel sender", async () => {
    const generatorInputs: unknown[] = [];
    const persistAssistantReply = vi.fn(async () => ({ messageId: "ai_message_123" }));
    const registerTokenUsage = vi.fn(async () => ({ totalTokens: 15 }));
    const sendReply = vi.fn(async () => ({ ok: true, providerMessageId: "mid_ai" }));
    const runner = createChannelAiReplyRunner({
      env: {
        OPENAI_API_KEY: "sk-labs",
        OPENAI_MODEL_PROFESSIONAL: "gpt-selected",
      } as NodeJS.ProcessEnv,
      knowledge: { async buildContext() { return "Horario: 9 a 18"; } },
      catalog: {
        async buildAiResources() {
          return {
            context: "Producto A",
            allowedImageUrls: ["https://cdn.vase.ar/p1.jpg"],
          };
        },
      },
      createReplyGenerator(input) {
        generatorInputs.push(input);
        return {
          generateReply: async ({ context, systemPrompt, allowedImageUrls }) => {
            expect(systemPrompt).toBe("Responde como vendedor experto.");
            expect(context).toContain("Horario: 9 a 18");
            expect(context).toContain("Producto A");
            expect(allowedImageUrls).toEqual(["https://cdn.vase.ar/p1.jpg"]);
            return {
              text: "Respuesta IA",
              imageUrls: ["https://cdn.vase.ar/p1.jpg"],
              inputTokens: 10,
              outputTokens: 5,
              provider: "openai",
              model: input.model,
              profile: "professional",
            };
          },
        };
      },
      persistAssistantReply,
      registerTokenUsage,
      sendReply,
    });

    const result = await runner({
      context: {
        assistantId: "assistant_123",
        assistantModel: "gpt-selected",
        assistantSystemPrompt: "Responde como vendedor experto.",
        globalTenantId: "tenant_123",
        tenantSlug: "tenant-demo",
        channelType: "FACEBOOK",
        channel: { id: "channel_123", provider: "META_OFFICIAL", status: "CONNECTED", config: {} },
        entitlement: null,
      },
      message: {
        id: "inbound_123",
        globalTenantId: "tenant_123",
        channelType: "FACEBOOK",
        provider: "META_OFFICIAL",
        externalThreadKey: "customer_123",
        customerContact: "customer_123",
        messageType: "text",
        text: "Hola",
        rawPayload: null,
      },
      persisted: { conversationId: "conversation_123", messageId: "message_123", aiBlockedReason: null },
    });

    expect(generatorInputs).toEqual([{ apiKey: "sk-labs", model: "gpt-selected" }]);
    expect(persistAssistantReply).toHaveBeenCalledWith({
      assistantId: "assistant_123",
      conversationId: "conversation_123",
      channel: "FACEBOOK",
      text: "Respuesta IA",
      imageUrls: ["https://cdn.vase.ar/p1.jpg"],
    });
    expect(registerTokenUsage).toHaveBeenCalledWith(expect.objectContaining({
      globalTenantId: "tenant_123",
      channel: "FACEBOOK",
      inputTokens: 10,
      outputTokens: 5,
      messageId: "ai_message_123",
      source: "openai:gpt-selected:professional",
      model: "gpt-selected",
      profile: "professional",
    }));
    expect(sendReply).toHaveBeenCalledWith({
      globalTenantId: "tenant_123",
      channelId: "channel_123",
      channel: "FACEBOOK",
      conversationId: "conversation_123",
      recipientId: "customer_123",
      text: "Respuesta IA",
      imageUrls: ["https://cdn.vase.ar/p1.jpg"],
    });
    expect(result).toEqual({ ok: true, messageId: "ai_message_123", totalTokens: 15 });
  });

  it("prefers the assistant OpenAI key over the global environment key", async () => {
    const generatorInputs: unknown[] = [];
    const runner = createChannelAiReplyRunner({
      env: {
        OPENAI_API_KEY: "sk-env",
        OPENAI_MODEL_PROFESSIONAL: "gpt-selected",
      } as NodeJS.ProcessEnv,
      async resolveOpenAiApiKey(assistantId) {
        expect(assistantId).toBe("assistant_123");
        return "sk-assistant";
      },
      knowledge: { async buildContext() { return ""; } },
      createReplyGenerator(input) {
        generatorInputs.push(input);
        return {
          generateReply: async () => ({ text: "Respuesta", inputTokens: 1, outputTokens: 1, provider: "openai", model: input.model, profile: "professional" }),
        };
      },
      persistAssistantReply: vi.fn(async () => ({ messageId: "ai_message_123" })),
      registerTokenUsage: vi.fn(async () => ({ totalTokens: 2 })),
      sendReply: vi.fn(async () => ({ ok: true })),
    });

    await runner({
      context: {
        assistantId: "assistant_123",
        assistantModel: "gpt-selected",
        globalTenantId: "tenant_123",
        tenantSlug: "tenant-demo",
        channelType: "WHATSAPP",
        channel: { id: "channel_123", provider: "META_OFFICIAL", status: "CONNECTED", config: {} },
        entitlement: null,
      },
      message: {
        id: "inbound_123",
        globalTenantId: "tenant_123",
        channelType: "WHATSAPP",
        provider: "META_OFFICIAL",
        externalThreadKey: "549223",
        customerContact: "549223",
        messageType: "text",
        text: "Hola",
        rawPayload: null,
      },
      persisted: { conversationId: "conversation_123", messageId: "message_123", aiBlockedReason: null },
    });

    expect(generatorInputs).toEqual([{ apiKey: "sk-assistant", model: "gpt-selected" }]);
  });

  it("falls back to an approved model when the stored assistant model is no longer in the chatbot catalog", async () => {
    const generatorInputs: unknown[] = [];
    const runner = createChannelAiReplyRunner({
      env: {
        OPENAI_API_KEY: "sk-env",
        OPENAI_MODEL_ECONOMIC: "gpt-5-mini-approved",
      } as NodeJS.ProcessEnv,
      knowledge: { async buildContext() { return ""; } },
      createReplyGenerator(input) {
        generatorInputs.push(input);
        return {
          generateReply: async () => ({
            text: "Respuesta",
            inputTokens: 1,
            outputTokens: 1,
            provider: "openai",
            model: input.model,
            profile: "economic",
          }),
        };
      },
      persistAssistantReply: vi.fn(async () => ({ messageId: "ai_message_123" })),
      registerTokenUsage: vi.fn(async () => ({ totalTokens: 2 })),
      sendReply: vi.fn(async () => ({ ok: true })),
    });

    await runner({
      context: {
        assistantId: "assistant_123",
        assistantModel: "gpt-4o",
        globalTenantId: "tenant_123",
        tenantSlug: "tenant-demo",
        channelType: "WHATSAPP",
        channel: { id: "channel_123", provider: "META_OFFICIAL", status: "CONNECTED", config: {} },
        entitlement: null,
      },
      message: {
        id: "inbound_123",
        globalTenantId: "tenant_123",
        channelType: "WHATSAPP",
        provider: "META_OFFICIAL",
        externalThreadKey: "549223",
        customerContact: "549223",
        messageType: "text",
        text: "Hola",
        rawPayload: null,
      },
      persisted: { conversationId: "conversation_123", messageId: "message_123", aiBlockedReason: null },
    });

    expect(generatorInputs).toEqual([{ apiKey: "sk-env", model: "gpt-5-mini-approved" }]);
  });

  it("does not generate an automatic answer when a human handoff is active", async () => {
    const generateReply = vi.fn(async () => ({ text: "Respuesta", inputTokens: 1, outputTokens: 1 }));
    const sendReply = vi.fn(async () => ({ ok: true }));
    const runner = createChannelAiReplyRunner({
      env: { OPENAI_API_KEY: "sk-env" } as NodeJS.ProcessEnv,
      knowledge: { async buildContext() { return ""; } },
      createReplyGenerator() {
        return { generateReply };
      },
      persistAssistantReply: vi.fn(async () => ({ messageId: "ai_message_123" })),
      registerTokenUsage: vi.fn(async () => ({ totalTokens: 2 })),
      sendReply,
    });

    const result = await runner({
      context: {
        assistantId: "assistant_123",
        assistantModel: "gpt-selected",
        globalTenantId: "tenant_123",
        tenantSlug: "tenant-demo",
        channelType: "WHATSAPP",
        channel: { id: "channel_123", provider: "META_OFFICIAL", status: "CONNECTED", config: {} },
        entitlement: null,
      },
      message: {
        id: "inbound_123",
        globalTenantId: "tenant_123",
        channelType: "WHATSAPP",
        provider: "META_OFFICIAL",
        externalThreadKey: "549223",
        customerContact: "549223",
        messageType: "text",
        text: "Hola",
        rawPayload: null,
      },
      persisted: {
        conversationId: "conversation_123",
        messageId: "message_123",
        aiBlockedReason: null,
        handoffActive: true,
      },
    });

    expect(result).toEqual({ ok: false, reason: "HANDOFF_ACTIVE" });
    expect(generateReply).not.toHaveBeenCalled();
    expect(sendReply).not.toHaveBeenCalled();
  });

  it("clears a stale AI reply error transactionally when a later assistant reply succeeds", async () => {
    const operationOrder: string[] = [];
    const rowLock = vi.fn(async () => {
      operationOrder.push("lock");
      return [{ id: "conversation_1" }];
    });
    const conversationFindUnique = vi.fn(async () => {
      operationOrder.push("read");
      return {
      metadata: {
        state: "AI_FAILED",
        source: "instagram",
        context: {
          provider: "META_OFFICIAL",
          aiReplyError: "OPENAI_TIMEOUT",
          aiReplyFailedAt: "2026-07-23T15:00:00.000Z",
          aiReplyFailedMessageId: "inbound_failed",
        },
      },
      };
    });
    const conversationUpdate = vi.fn(async () => ({}));
    const transactionClient = {
      $queryRaw: rowLock,
      message: { create: vi.fn(async () => ({ id: "reply_recovered" })) },
      conversation: {
        findUnique: conversationFindUnique,
        update: conversationUpdate,
      },
    };
    const prisma = {
      async $transaction(callback: (client: typeof transactionClient) => unknown) {
        return callback(transactionClient);
      },
    };

    await persistPrismaAssistantReply(prisma as never, {
      assistantId: "assistant_1",
      conversationId: "conversation_1",
      channel: "INSTAGRAM",
      text: "Ya puedo responderte.",
    });

    expect(operationOrder.slice(0, 2)).toEqual(["lock", "read"]);
    const [query, ...values] = rowLock.mock.calls[0];
    expect(Array.from(query as TemplateStringsArray).join(" ")).toContain("FOR UPDATE");
    expect(Array.from(query as TemplateStringsArray).join(" ")).toContain("assistantId");
    expect(values).toEqual(["conversation_1", "assistant_1"]);
    expect(conversationFindUnique).toHaveBeenCalledWith({
      where: { id: "conversation_1" },
      select: { metadata: true },
    });
    const update = conversationUpdate.mock.calls[0][0];
    expect(update.data.metadata).toEqual({
      state: "IDLE",
      source: "instagram",
      context: {
        provider: "META_OFFICIAL",
      },
    });
    expect(JSON.stringify(update.data.metadata)).not.toContain("OPENAI_TIMEOUT");
    expect(JSON.stringify(update.data.metadata)).not.toContain("aiReplyFailed");
  });
});
