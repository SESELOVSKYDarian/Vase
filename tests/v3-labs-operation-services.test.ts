import { describe, expect, it, vi } from "vitest";
import { createAiOrchestrator } from "../apps/vase-labs/app/lib/ai-orchestrator";
import { summarizeLabsAnalytics } from "../apps/vase-labs/app/lib/analytics-service";
import { createHandoffService } from "../apps/vase-labs/app/lib/handoff-service";
import { createInboxService } from "../apps/vase-labs/app/lib/inbox-service";
import { createKnowledgeService } from "../apps/vase-labs/app/lib/knowledge-service";
import { sendMetaTextMessage } from "../apps/vase-labs/app/lib/meta-sender";

describe("Vase Labs operation services", () => {
  it("sends Instagram and Facebook text messages through the Graph messages endpoint", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const fetcher = async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return new Response(JSON.stringify({ recipient_id: "user_123", message_id: "mid_123" }), { status: 200 });
    };

    const result = await sendMetaTextMessage({
      channelType: "FACEBOOK",
      recipientId: "user_123",
      text: "Hola",
      accessToken: "token",
      pageOrAccountId: "page_123",
      fetcher,
    });

    expect(result).toMatchObject({ ok: true, providerMessageId: "mid_123" });
    expect(calls[0]?.url).toContain("/page_123/messages");
    expect(calls[0]?.init.headers).toMatchObject({ Authorization: "Bearer token" });
  });

  it("lists inbox conversations by tenant and excludes other tenants", async () => {
    const inbox = createInboxService({
      async listConversations() {
        return [
          { id: "conv_1", globalTenantId: "tenant_123", channel: "INSTAGRAM", status: "OPEN", customerName: "Ana", lastMessageAt: new Date("2026-06-25T00:00:00.000Z"), messageCount: 2, escalatedToHuman: false },
        ];
      },
      async getConversation() {
        return null;
      },
      async listMessages() {
        return [];
      },
    });

    const result = await inbox.listConversations({ globalTenantId: "tenant_123" });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "conv_1", channel: "INSTAGRAM", customerName: "Ana" });
  });

  it("creates and resolves human handoffs", async () => {
    const handoff = createHandoffService({
      async createHandoff(input) {
        return { id: "handoff_123", status: "PENDING", ...input, createdAt: new Date("2026-06-25T00:00:00.000Z"), resolvedAt: null };
      },
      async updateHandoff(id, data) {
        return { id, conversationId: "conv_123", reason: "needs human", target: "workplace", status: data.status ?? "RESOLVED", assignedTo: data.assignedTo ?? "agent_123", notes: data.notes ?? null, priority: "normal", createdAt: new Date("2026-06-25T00:00:00.000Z"), resolvedAt: data.resolvedAt ?? null };
      },
      async markConversationEscalated() {},
    });

    const created = await handoff.requestHandoff({ conversationId: "conv_123", reason: "needs human" });
    const resolved = await handoff.resolveHandoff("handoff_123", "agent_123");

    expect(created.status).toBe("PENDING");
    expect(resolved.status).toBe("RESOLVED");
    expect(resolved.resolvedAt).toBeTruthy();
  });

  it("uses ready knowledge in the AI context and records token usage", async () => {
    const knowledge = createKnowledgeService({
      async listReadyKnowledge() {
        return [{ id: "k_1", title: "Horario", content: "Atendemos de 9 a 18.", sourceType: "manual", status: "READY" }];
      },
    });
    const markAssistantReplyDelivery = vi.fn(async () => undefined);
    const generateReply = vi.fn(async (input) => {
      expect(input.context).toContain("Atendemos de 9 a 18.");
      expect(input.context).toContain("Producto estrella");
      return {
        text: "Atendemos de 9 a 18.",
        imageUrls: ["https://cdn.vase.ar/p1.jpg"],
        inputTokens: 20,
        outputTokens: 30,
        provider: "openai" as const,
        model: "gpt-test",
        profile: "professional" as const,
      };
    });
    const persistAssistantReply = vi.fn(async (input) => ({ messageId: "msg_ai", ...input }));
    const sendReply = vi.fn(async () => ({ ok: true, providerMessageId: "mid_ai" }));
    const orchestrator = createAiOrchestrator({
      knowledge,
      catalog: {
        async buildAiResources() {
          return {
            context: "# Producto estrella\nSKU: A1 | Precio: 1200 | Stock: 3",
            allowedImageUrls: ["https://cdn.vase.ar/p1.jpg"],
          };
        },
      },
      generateReply,
      persistAssistantReply,
      async registerTokenUsage(input) {
        expect(input.source).toBe("openai:gpt-test:professional");
        return { totalTokens: input.inputTokens + input.outputTokens };
      },
      sendReply,
      markAssistantReplyDelivery,
    });

    const result = await orchestrator.processConversation({
      assistantId: "assistant_123",
      conversationId: "conv_123",
      globalTenantId: "tenant_123",
      channel: "INSTAGRAM",
      latestUserText: "Horario?",
      canRunAi: true,
      handoffActive: false,
    });

    expect(result).toMatchObject({ ok: true, messageId: "msg_ai", totalTokens: 50 });
    expect(generateReply).toHaveBeenCalledWith(expect.objectContaining({
      allowedImageUrls: ["https://cdn.vase.ar/p1.jpg"],
    }));
    expect(persistAssistantReply).toHaveBeenCalledWith({
      assistantId: "assistant_123",
      conversationId: "conv_123",
      channel: "INSTAGRAM",
      text: "Atendemos de 9 a 18.",
    });
    expect(sendReply).toHaveBeenCalledWith({
      channel: "INSTAGRAM",
      conversationId: "conv_123",
      text: "Atendemos de 9 a 18.",
      imageUrls: ["https://cdn.vase.ar/p1.jpg"],
    });
    expect(markAssistantReplyDelivery).toHaveBeenCalledWith({
      messageId: "msg_ai",
      status: "SENT",
      providerMessageId: "mid_ai",
    });
  });

  it("marks a persisted assistant reply as failed when Meta rejects delivery", async () => {
    const markAssistantReplyDelivery = vi.fn(async () => undefined);
    const orchestrator = createAiOrchestrator({
      knowledge: createKnowledgeService({ async listReadyKnowledge() { return []; } }),
      async generateReply() {
        return {
          text: "Respuesta",
          imageUrls: ["https://cdn.vase.ar/p1.jpg"],
          inputTokens: 1,
          outputTokens: 1,
        };
      },
      async persistAssistantReply() { return { messageId: "msg_failed" }; },
      async registerTokenUsage() { return { totalTokens: 2 }; },
      async sendReply() { throw new Error("META_SEND_FAILED"); },
      markAssistantReplyDelivery,
    });

    await expect(orchestrator.processConversation({
      assistantId: "assistant_123",
      conversationId: "conv_123",
      globalTenantId: "tenant_123",
      channel: "WHATSAPP",
      latestUserText: "Hola",
      canRunAi: true,
      handoffActive: false,
    })).rejects.toThrow("META_SEND_FAILED");
    expect(markAssistantReplyDelivery).toHaveBeenCalledWith({
      messageId: "msg_failed",
      status: "FAILED",
      error: "META_SEND_FAILED",
    });
  });

  it("uses conversation history and replaces a PREPARE proposal with the authoritative quote", async () => {
    const generateReply = vi.fn(async (input) => {
      expect(input.context).toContain("Cliente: Quiero una boquilla");
      return {
        text: "Texto provisional del modelo",
        imageUrls: [],
        orderAction: {
          type: "PREPARE" as const,
          items: [{ productId: "product_1004", quantity: 1 }],
          customer: { name: "Darian", phone: "2234390415" },
          fulfillment: { type: "PICKUP" as const, branchId: "branch_1" },
        },
        inputTokens: 5,
        outputTokens: 4,
      };
    });
    const prepare = vi.fn(async () => ({
      text: "Resumen real de Business\nTotal: $9.614,15\n¿Confirmás el pedido?",
    }));
    const persistAssistantReply = vi.fn(async () => ({ messageId: "message_quote" }));
    const orchestrator = createAiOrchestrator({
      knowledge: { async buildContext() { return ""; } },
      orders: {
        async buildContext() { return "Cliente: Quiero una boquilla"; },
        async confirmIfRequested() { return { handled: false as const }; },
        prepare,
      },
      generateReply,
      persistAssistantReply,
      async registerTokenUsage() { return { totalTokens: 9 }; },
      async sendReply() { return { ok: true }; },
    });

    await orchestrator.processConversation({
      assistantId: "assistant_1",
      conversationId: "conversation_1",
      globalTenantId: "tenant_1",
      channel: "WHATSAPP",
      latestUserText: "Envialo",
      canRunAi: true,
      handoffActive: false,
    });

    expect(prepare).toHaveBeenCalledWith(expect.objectContaining({
      conversationId: "conversation_1",
      action: expect.objectContaining({ type: "PREPARE" }),
    }));
    expect(persistAssistantReply).toHaveBeenCalledWith(expect.objectContaining({
      text: "Resumen real de Business\nTotal: $9.614,15\n¿Confirmás el pedido?",
    }));
  });

  it("confirms an active draft before asking the model again", async () => {
    const generateReply = vi.fn();
    const persistAssistantReply = vi.fn(async () => ({ messageId: "message_confirmed" }));
    const orchestrator = createAiOrchestrator({
      knowledge: { async buildContext() { return ""; } },
      orders: {
        async buildContext() { return ""; },
        async confirmIfRequested() {
          return { handled: true as const, text: "Pedido confirmado. Tu número es V-1042." };
        },
        prepare: vi.fn(),
      },
      generateReply,
      persistAssistantReply,
      async registerTokenUsage() { return { totalTokens: 0 }; },
      async sendReply() { return { ok: true }; },
    });

    await orchestrator.processConversation({
      assistantId: "assistant_1",
      conversationId: "conversation_1",
      globalTenantId: "tenant_1",
      channel: "WHATSAPP",
      latestUserText: "Acepto el pedido",
      canRunAi: true,
      handoffActive: false,
    });

    expect(generateReply).not.toHaveBeenCalled();
    expect(persistAssistantReply).toHaveBeenCalledWith(expect.objectContaining({
      text: "Pedido confirmado. Tu número es V-1042.",
    }));
  });

  it("summarizes analytics from conversations, messages, token usage and channels", () => {
    const summary = summarizeLabsAnalytics({
      conversations: [
        { status: "OPEN", escalatedToHuman: false },
        { status: "ESCALATED", escalatedToHuman: true },
      ],
      messages: [
        { direction: "INBOUND", channel: "INSTAGRAM" },
        { direction: "OUTBOUND", channel: "INSTAGRAM" },
      ],
      tokenUsages: [{ totalTokens: 500, costCents: 25 }],
      channels: [{ type: "INSTAGRAM", status: "CONNECTED" }],
      handoffs: [{ status: "PENDING" }],
    });

    expect(summary).toMatchObject({
      conversationsOpen: 1,
      conversationsEscalated: 1,
      inboundMessages: 1,
      outboundMessages: 1,
      tokensUsed: 500,
      costCents: 25,
      connectedChannels: 1,
      pendingHandoffs: 1,
    });
  });
});
