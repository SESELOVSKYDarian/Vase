import { randomUUID } from "node:crypto";
import type { LabsChannel } from "@vase/contracts";
import { labsPrisma } from "./db";
import { changeOrderOperationalStatus, type OrderOperationalStatus } from "./order-operations";
import { createOfficialChannelSender } from "./official-channel-sender";
import { PrismaOfficialChannelSenderRepository } from "./official-channel-sender-repository";

function fulfillmentFromSnapshot(raw: unknown) {
  const fulfillment = (raw as { fulfillment?: unknown } | null)?.fulfillment;
  return fulfillment && typeof fulfillment === "object"
    ? fulfillment as { pickupLabel?: string | null; address?: string | null }
    : {};
}

export async function operateOrder(input: {
  globalTenantId: string;
  orderId: string;
  status: OrderOperationalStatus;
  retryNotification?: boolean;
}) {
  return changeOrderOperationalStatus(input, {
    async loadOrder(where) {
      const order = await labsPrisma.businessOrderProjection.findFirst({
        where: { id: where.orderId, globalTenantId: where.globalTenantId },
      });
      return order ? { ...order, fulfillment: fulfillmentFromSnapshot(order.rawSnapshot) } : null;
    },
    async saveStatus(change) {
      await labsPrisma.$transaction(async (tx) => {
        const current = await tx.businessOrderProjection.findUnique({
          where: { id: change.orderId },
          select: { operationalStatus: true },
        });
        await tx.businessOrderProjection.update({
          where: { id: change.orderId },
          data: {
            operationalStatus: change.status,
            operationalUpdatedAt: change.now,
            ...(change.status === "READY" ? { readyAt: change.now } : {}),
            ...(change.notificationStatus ? {
              customerNotificationStatus: change.notificationStatus,
              customerNotificationError: change.notificationError ?? null,
              ...(change.notificationStatus === "SENT" ? { customerNotifiedAt: change.now } : {}),
            } : {}),
          },
        });
        await tx.orderStatusEvent.create({
          data: {
            orderProjectionId: change.orderId,
            fromStatus: current?.operationalStatus ?? null,
            toStatus: change.status,
            notificationStatus: change.notificationStatus ?? null,
            error: change.notificationError ?? null,
          },
        });
      });
    },
    async notifyReady({ order, text }) {
      const conversation = await labsPrisma.conversation.findUnique({
        where: { id: order.conversationId! },
        select: {
          id: true,
          channel: true,
          customerContact: true,
          externalUserId: true,
          externalThreadKey: true,
        },
      });
      const recipientId = conversation?.externalUserId?.trim()
        || conversation?.externalThreadKey?.trim()
        || conversation?.customerContact?.trim();
      if (!conversation?.channel || !recipientId) throw new Error("CONVERSATION_NOT_DELIVERABLE");
      const sender = createOfficialChannelSender({
        repository: new PrismaOfficialChannelSenderRepository(labsPrisma),
        encryptionSecret: process.env.TOKEN_ENCRYPTION_SECRET ?? "",
        graphVersion: process.env.META_GRAPH_VERSION?.trim() || "v25.0",
      });
      const delivery = await sender.send({
        globalTenantId: input.globalTenantId,
        channelType: conversation.channel as LabsChannel,
        recipientId,
        text,
      });
      const now = new Date();
      const messageId = randomUUID();
      await labsPrisma.$transaction([
        labsPrisma.message.create({
          data: {
            id: messageId,
            conversationId: conversation.id,
            role: "assistant",
            direction: "OUTBOUND",
            content: text,
            providerMessageId: delivery.providerMessageId,
            metadata: { source: "order_ready_notification", orderId: order.id },
            createdAt: now,
          },
        }),
        labsPrisma.messageDelivery.create({
          data: {
            id: randomUUID(),
            messageId,
            channel: conversation.channel,
            status: "SENT",
            providerMessageId: delivery.providerMessageId,
            sentAt: now,
          },
        }),
        labsPrisma.conversation.update({
          where: { id: conversation.id },
          data: {
            messageCount: { increment: 1 },
            lastMessageAt: now,
            lastOutboundAt: now,
          },
        }),
      ]);
      return { ok: true as const };
    },
  });
}
