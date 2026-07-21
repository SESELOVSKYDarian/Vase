import { describe, expect, it, vi } from "vitest";
import { createInboxReplyHandler, persistHumanInboxReply } from "../apps/vase-labs/app/api/v1/inbox/[tenantSlug]/conversations/[conversationId]/reply/route";

describe("Labs Inbox human replies", () => {
  it("persists a human intervention reply and updates the conversation activity", async () => {
    const writes: unknown[] = [];
    const prisma = {
      $transaction: async (callback: (tx: any) => Promise<unknown>) => callback({
        message: {
          create: vi.fn(async (input) => {
            writes.push({ type: "message", input });
            return { id: input.data.id };
          }),
        },
        messageDelivery: {
          create: vi.fn(async (input) => {
            writes.push({ type: "delivery", input });
            return input.data;
          }),
        },
        conversation: {
          update: vi.fn(async (input) => {
            writes.push({ type: "conversation", input });
            return input.data;
          }),
        },
      }),
    };
    const now = new Date("2026-07-21T21:05:00.000Z");

    const result = await persistHumanInboxReply(prisma as any, {
      conversationId: "conversation_123",
      channel: "WHATSAPP",
      text: "Hola, soy del equipo. Te ayudo por aca.",
      providerMessageId: "wamid.manual",
      now,
    });

    expect(result.messageId).toEqual(expect.any(String));
    expect(writes).toMatchObject([
      {
        type: "message",
        input: {
          data: {
            conversationId: "conversation_123",
            role: "human_agent",
            direction: "OUTBOUND",
            content: "Hola, soy del equipo. Te ayudo por aca.",
            providerMessageId: "wamid.manual",
            metadata: { source: "human_inbox" },
          },
        },
      },
      {
        type: "delivery",
        input: {
          data: {
            messageId: result.messageId,
            channel: "WHATSAPP",
            status: "SENT",
            providerMessageId: "wamid.manual",
            sentAt: now,
          },
        },
      },
      {
        type: "conversation",
        input: {
          where: { id: "conversation_123" },
          data: {
            messageCount: { increment: 1 },
            lastMessageAt: now,
            lastOutboundAt: now,
            status: "OPEN",
          },
        },
      },
    ]);
  });

  it("sends a tenant-scoped manual reply through the official channel sender", async () => {
    const sendReply = vi.fn(async () => ({ ok: true, providerMessageId: "wamid.manual" }));
    const persistReply = vi.fn(async () => ({
      messageId: "message_manual",
      createdAt: new Date("2026-07-21T21:05:00.000Z"),
    }));
    const POST = createInboxReplyHandler({
      resolveContext: async () => ({
        context: { tenantSlug: "sanitarios-el-teflon", globalTenantId: "tenant_123" },
      }),
      findConversation: async () => ({
        id: "conversation_123",
        channel: "WHATSAPP",
        customerContact: "5492235638583",
      }),
      sendReply,
      persistReply,
    });

    const response = await POST(new Request("https://labs.vase.ar/api/v1/inbox/sanitarios-el-teflon/conversations/conversation_123/reply", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "labs=session" },
      body: JSON.stringify({ text: "Te responde una persona del equipo." }),
    }), {
      params: Promise.resolve({ tenantSlug: "sanitarios-el-teflon", conversationId: "conversation_123" }),
    });

    expect(response.status).toBe(200);
    expect(sendReply).toHaveBeenCalledWith({
      globalTenantId: "tenant_123",
      channelType: "WHATSAPP",
      recipientId: "5492235638583",
      text: "Te responde una persona del equipo.",
    });
    expect(persistReply).toHaveBeenCalledWith(expect.objectContaining({
      conversationId: "conversation_123",
      channel: "WHATSAPP",
      text: "Te responde una persona del equipo.",
      providerMessageId: "wamid.manual",
    }));
    expect(await response.json()).toMatchObject({
      message: {
        id: "message_manual",
        role: "human_agent",
        direction: "OUTBOUND",
        content: "Te responde una persona del equipo.",
      },
      delivery: { status: "SENT" },
    });
  });
});
