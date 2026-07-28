import { Prisma } from "@prisma/client";
import { db } from "../db";
import { noCertifiedDeliveryAdapter } from "./provider-adapter";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export const prismaDeliveryRepository = {
  async findReceipt(globalTenantId: string, commandId: string) {
    return (await db.deliveryCommandReceipt.findUnique({
      where: { globalTenantId_commandId: { globalTenantId, commandId } },
    }))?.response ?? null;
  },
  getOrder(globalTenantId: string, branchId: string, deliveryOrderId: string) {
    return db.deliveryOrder.findFirst({
      where: { id: deliveryOrderId, globalTenantId, branchId },
      select: {
        id: true,
        globalTenantId: true,
        branchId: true,
        connectionId: true,
        providerOrderId: true,
        status: true,
      },
    });
  },
  getConnection(connectionId: string) {
    return db.deliveryConnection.findUnique({
      where: { id: connectionId },
      select: { id: true, status: true, provider: true },
    });
  },
  adapterFor: noCertifiedDeliveryAdapter,
  async saveResult(input: Record<string, unknown>) {
    return db.$transaction(async (tx) => {
      const deliveryOrder = await tx.deliveryOrder.findFirstOrThrow({
        where: {
          id: String(input.deliveryOrderId),
          globalTenantId: String(input.globalTenantId),
          branchId: String(input.branchId),
        },
      });
      const response = {
        deliveryOrderId: deliveryOrder.id,
        status: String(input.status),
        action: String(input.action),
      };
      await tx.deliveryOrder.update({
        where: { id: deliveryOrder.id },
        data: {
          status: String(input.status),
          providerPayload: json(input.providerResponse),
          lastError: null,
        },
      });
      await tx.deliveryConnection.update({
        where: { id: deliveryOrder.connectionId },
        data: { lastSuccessfulOperationAt: new Date(), lastError: null },
      });
      await tx.deliveryCommandReceipt.create({
        data: {
          restTenantId: deliveryOrder.restTenantId,
          globalTenantId: deliveryOrder.globalTenantId,
          commandId: String(input.commandId),
          response: json(response),
        },
      });
      return response;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },
};

export const prismaDeliveryWebhookRepository = {
  findEvent(connectionId: string, eventId: string) {
    return db.deliveryWebhookEvent.findUnique({
      where: {
        connectionId_providerEventId: {
          connectionId,
          providerEventId: eventId,
        },
      },
    });
  },
  getConnection(connectionId: string) {
    return db.deliveryConnection.findUnique({
      where: { id: connectionId },
      select: {
        id: true,
        globalTenantId: true,
        status: true,
        provider: true,
      },
    });
  },
  adapterFor: noCertifiedDeliveryAdapter,
  async store(input: {
    connection: { id: string; globalTenantId: string };
    eventId: string;
    eventType: string;
    payloadHash: string;
    normalizedOrder: {
      providerOrderId: string;
      status: string;
      total: string;
      currency: string;
      customerName?: string;
      deliveryAddress?: string;
      providerCreatedAt?: string;
      providerPayload: unknown;
    };
  }) {
    return db.$transaction(async (tx) => {
      const connection = await tx.deliveryConnection.findUniqueOrThrow({
        where: { id: input.connection.id },
      });
      const order = await tx.deliveryOrder.upsert({
        where: {
          connectionId_providerOrderId: {
            connectionId: connection.id,
            providerOrderId: input.normalizedOrder.providerOrderId,
          },
        },
        create: {
          restTenantId: connection.restTenantId,
          globalTenantId: connection.globalTenantId,
          branchId: connection.branchId,
          connectionId: connection.id,
          providerOrderId: input.normalizedOrder.providerOrderId,
          status: input.normalizedOrder.status,
          customerName: input.normalizedOrder.customerName,
          deliveryAddress: input.normalizedOrder.deliveryAddress,
          total: new Prisma.Decimal(input.normalizedOrder.total),
          currency: input.normalizedOrder.currency,
          providerCreatedAt: input.normalizedOrder.providerCreatedAt
            ? new Date(input.normalizedOrder.providerCreatedAt) : null,
          normalizedPayload: json(input.normalizedOrder),
          providerPayload: json(input.normalizedOrder.providerPayload),
        },
        update: {
          status: input.normalizedOrder.status,
          normalizedPayload: json(input.normalizedOrder),
          providerPayload: json(input.normalizedOrder.providerPayload),
          lastError: null,
        },
      });
      const result = { deliveryOrderId: order.id, status: order.status };
      await tx.deliveryWebhookEvent.create({
        data: {
          restTenantId: connection.restTenantId,
          globalTenantId: connection.globalTenantId,
          connectionId: connection.id,
          providerEventId: input.eventId,
          eventType: input.eventType,
          payloadHash: input.payloadHash,
          result: json(result),
        },
      });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },
};
