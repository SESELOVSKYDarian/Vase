import { describe, expect, it, vi } from "vitest";
import { createInboxReplyHandler, persistHumanInboxReply } from "../apps/vase-labs/app/api/v1/inbox/[tenantSlug]/conversations/[conversationId]/reply/route";

describe("Labs Inbox human replies", () => {
  it("persists a human intervention reply and updates the conversation activity", async () => {
    const writes: unknown[] = [];
    const prisma = {
      $transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback({
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

    const result = await persistHumanInboxReply(
      prisma as unknown as Parameters<typeof persistHumanInboxReply>[0],
      {
      conversationId: "conversation_123",
      channel: "WHATSAPP",
      text: "Hola, soy del equipo. Te ayudo por aca.",
      providerMessageId: "wamid.manual",
      now,
      },
    );

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
            status: "PENDING",
            providerMessageId: "wamid.manual",
            sentAt: null,
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
      markReplyDelivery: vi.fn(),
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
      providerMessageId: null,
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

  it("uses the Instagram sender-scoped thread id before a stale external user id", async () => {
    const sendReply = vi.fn(async () => ({ ok: true, providerMessageId: "mid_manual" }));
    const POST = createInboxReplyHandler({
      resolveContext: async () => ({
        context: { tenantSlug: "tenant-demo", globalTenantId: "tenant_123" },
      }),
      findConversation: async () => ({
        id: "conversation_123",
        channel: "INSTAGRAM",
        customerContact: null,
        externalUserId: "ig_user_123",
        externalThreadKey: "ig_thread_123",
      }),
      sendReply,
      persistReply: vi.fn(async () => ({
        messageId: "message_manual",
        createdAt: new Date("2026-07-24T15:00:00.000Z"),
      })),
      markReplyDelivery: vi.fn(),
    });

    const response = await POST(new Request("https://labs.vase.ar", {
      method: "POST",
      body: JSON.stringify({ text: "Hola desde el equipo" }),
    }), {
      params: Promise.resolve({ tenantSlug: "tenant-demo", conversationId: "conversation_123" }),
    });

    expect(response.status).toBe(200);
    expect(sendReply).toHaveBeenCalledWith(expect.objectContaining({
      recipientId: "ig_thread_123",
    }));
  });

  it("prefers the Meta thread identifier over a formatted customer contact", async () => {
    const sendReply = vi.fn(async () => ({ ok: true, providerMessageId: "wamid_manual" }));
    const POST = createInboxReplyHandler({
      resolveContext: async () => ({
        context: { tenantSlug: "tenant-demo", globalTenantId: "tenant_123" },
      }),
      findConversation: async () => ({
        id: "conversation_123",
        channel: "WHATSAPP",
        customerContact: "+54 9 11 2261-5555",
        externalUserId: "5491122615555",
        externalThreadKey: "5491122615555",
      }),
      sendReply,
      persistReply: vi.fn(async () => ({
        messageId: "message_manual",
        createdAt: new Date("2026-07-26T15:00:00.000Z"),
      })),
      markReplyDelivery: vi.fn(),
    });

    const response = await POST(new Request("https://labs.vase.ar", {
      method: "POST",
      body: JSON.stringify({ text: "Hola Alexis, te ayudo con el pedido." }),
    }), {
      params: Promise.resolve({ tenantSlug: "tenant-demo", conversationId: "conversation_123" }),
    });

    expect(response.status).toBe(200);
    expect(sendReply).toHaveBeenCalledWith(expect.objectContaining({
      recipientId: "5491122615555",
    }));
  });

  it("returns safe provider diagnostics and does not persist a rejected reply", async () => {
    const persistReply = vi.fn(async () => ({
      messageId: "message_manual",
      createdAt: new Date("2026-07-26T15:00:00.000Z"),
    }));
    const markReplyDelivery = vi.fn();
    const POST = createInboxReplyHandler({
      resolveContext: async () => ({
        context: { tenantSlug: "tenant-demo", globalTenantId: "tenant_123" },
      }),
      findConversation: async () => ({
        id: "conversation_123",
        channel: "WHATSAPP",
        customerContact: "549223",
        externalUserId: "549223",
        externalThreadKey: "549223",
      }),
      sendReply: vi.fn(async () => {
        const error = new Error("META_SEND_FAILED") as Error & {
          code: string;
          providerStatus: number;
          providerMessage: string;
        };
        error.code = "META_SEND_FAILED";
        error.providerStatus = 400;
        error.providerMessage = "Recipient is not allowed";
        throw error;
      }),
      persistReply,
      markReplyDelivery,
    });

    const response = await POST(new Request("https://labs.vase.ar", {
      method: "POST",
      body: JSON.stringify({ text: "Hola" }),
    }), {
      params: Promise.resolve({ tenantSlug: "tenant-demo", conversationId: "conversation_123" }),
    });

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      error: "META_SEND_FAILED",
      providerStatus: 400,
      providerMessage: "Recipient is not allowed",
      requestId: expect.any(String),
    });
    expect(persistReply).toHaveBeenCalledWith(expect.objectContaining({
      conversationId: "conversation_123",
      channel: "WHATSAPP",
      text: "Hola",
      providerMessageId: null,
    }));
    expect(markReplyDelivery).toHaveBeenCalledWith({
      messageId: "message_manual",
      status: "FAILED",
      error: "META_SEND_FAILED",
    });
  });
});
