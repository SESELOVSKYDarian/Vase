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
          generateReply: async ({ context }) => {
            expect(context).toContain("Horario: 9 a 18");
            expect(context).toContain("Producto A");
            return { text: "Respuesta IA", inputTokens: 10, outputTokens: 5, provider: "openai", model: input.model, profile: "balanced" };
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
      source: "openai:gpt-selected:balanced",
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
});
