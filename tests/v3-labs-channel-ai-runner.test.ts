import { describe, expect, it, vi } from "vitest";
import { createChannelAiReplyRunner } from "../apps/vase-labs/app/lib/channel-ai-runner";

describe("channel AI reply runner", () => {
  it("uses the Labs OpenAI key and selected assistant model to reply through the channel sender", async () => {
    const generatorInputs: unknown[] = [];
    const persistAssistantReply = vi.fn(async () => ({ messageId: "ai_message_123" }));
    const registerTokenUsage = vi.fn(async () => ({ totalTokens: 15 }));
    const sendReply = vi.fn(async () => ({ ok: true, providerMessageId: "mid_ai" }));
    const runner = createChannelAiReplyRunner({
      env: { OPENAI_API_KEY: "sk-labs" } as NodeJS.ProcessEnv,
      knowledge: { async buildContext() { return "Horario: 9 a 18"; } },
      catalog: { async buildAiContext() { return "Producto A"; } },
      createReplyGenerator(input) {
        generatorInputs.push(input);
        return {
          generateReply: async ({ context, systemPrompt }) => {
            expect(systemPrompt).toBe("Responde como vendedor experto.");
            expect(context).toContain("Horario: 9 a 18");
            expect(context).toContain("Producto A");
            return { text: "Respuesta IA", inputTokens: 10, outputTokens: 5, provider: "openai", model: input.model, profile: "everyday" };
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
      conversationId: "conversation_123",
      channel: "FACEBOOK",
      text: "Respuesta IA",
    });
    expect(registerTokenUsage).toHaveBeenCalledWith(expect.objectContaining({
      globalTenantId: "tenant_123",
      channel: "FACEBOOK",
      inputTokens: 10,
      outputTokens: 5,
      messageId: "ai_message_123",
      source: "openai:gpt-selected:everyday",
    }));
    expect(sendReply).toHaveBeenCalledWith({
      globalTenantId: "tenant_123",
      channel: "FACEBOOK",
      conversationId: "conversation_123",
      recipientId: "customer_123",
      text: "Respuesta IA",
    });
    expect(result).toEqual({ ok: true, messageId: "ai_message_123", totalTokens: 15 });
  });

  it("prefers the assistant OpenAI key over the global environment key", async () => {
    const generatorInputs: unknown[] = [];
    const runner = createChannelAiReplyRunner({
      env: { OPENAI_API_KEY: "sk-env" } as NodeJS.ProcessEnv,
      async resolveOpenAiApiKey(assistantId) {
        expect(assistantId).toBe("assistant_123");
        return "sk-assistant";
      },
      knowledge: { async buildContext() { return ""; } },
      createReplyGenerator(input) {
        generatorInputs.push(input);
        return {
          generateReply: async () => ({ text: "Respuesta", inputTokens: 1, outputTokens: 1, provider: "openai", model: input.model, profile: "everyday" }),
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
});
