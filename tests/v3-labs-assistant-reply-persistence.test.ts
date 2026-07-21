import { describe, expect, it, vi } from "vitest";
import { markPrismaAssistantReplyDelivery, persistPrismaAssistantReply } from "../apps/vase-labs/app/lib/channel-ai-runner";

describe("assistant reply persistence", () => {
  it("stores a pending delivery and updates the Inbox conversation activity", async () => {
    const messageCreate = vi.fn(async () => ({ id: "message_1" }));
    const conversationUpdate = vi.fn(async () => ({}));
    const transactionClient = {
      message: { create: messageCreate },
      conversation: { update: conversationUpdate },
    };
    const prisma = {
      async $transaction(callback: (client: typeof transactionClient) => unknown) {
        return callback(transactionClient);
      },
    };

    const result = await persistPrismaAssistantReply(prisma as never, {
      conversationId: "conversation_1",
      channel: "WHATSAPP",
      text: "Hola desde Vase",
    });

    expect(result).toEqual({ messageId: "message_1" });
    expect(messageCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        conversationId: "conversation_1",
        role: "assistant",
        direction: "OUTBOUND",
        content: "Hola desde Vase",
        deliveries: { create: { channel: "WHATSAPP", status: "PENDING" } },
      }),
      select: { id: true },
    });
    expect(conversationUpdate).toHaveBeenCalledWith({
      where: { id: "conversation_1" },
      data: expect.objectContaining({
        messageCount: { increment: 1 },
        lastMessageAt: expect.any(Date),
        lastOutboundAt: expect.any(Date),
      }),
    });
  });

  it("records the provider message id when Meta confirms delivery", async () => {
    const updateMany = vi.fn(async () => ({ count: 1 }));

    await markPrismaAssistantReplyDelivery({ messageDelivery: { updateMany } } as never, {
      messageId: "message_1",
      status: "SENT",
      providerMessageId: "wamid.123",
    });

    expect(updateMany).toHaveBeenCalledWith({
      where: { messageId: "message_1", status: "PENDING" },
      data: expect.objectContaining({
        status: "SENT",
        providerMessageId: "wamid.123",
        sentAt: expect.any(Date),
        failedAt: null,
        error: null,
      }),
    });
  });
});
