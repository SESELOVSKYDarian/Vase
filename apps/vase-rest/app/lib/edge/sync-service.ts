import {
  restSyncEventSchema,
  type RestSyncEvent,
} from "@vase/contracts";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { z } from "zod";

export type SyncReceipt = {
  eventId: string;
  status: "ACCEPTED" | "CONFLICT" | "REJECTED";
  aggregateVersion: number;
  expectedVersion?: number;
  code?: string;
};
export interface CloudSyncRepository {
  findReceipt(globalTenantId: string, eventId: string): Promise<SyncReceipt | null>;
  getAggregateVersion(
    globalTenantId: string,
    aggregateType: string,
    aggregateId: string,
  ): Promise<number>;
  apply(event: RestSyncEvent): Promise<SyncReceipt>;
}

export function createCloudSyncService(repository: CloudSyncRepository) {
  return {
    async accept(raw: unknown): Promise<SyncReceipt> {
      const event = restSyncEventSchema.parse(raw);
      const prior = await repository.findReceipt(event.globalTenantId, event.eventId);
      if (prior) return prior;
      const current = await repository.getAggregateVersion(
        event.globalTenantId,
        event.aggregateType,
        event.aggregateId,
      );
      if (event.aggregateVersion !== current + 1) {
        return {
          eventId: event.eventId,
          status: "CONFLICT",
          aggregateVersion: current,
          expectedVersion: current + 1,
          code: "AGGREGATE_VERSION_CONFLICT",
        };
      }
      return repository.apply(event);
    },
  };
}

export const prismaCloudSyncRepository: CloudSyncRepository = {
  async findReceipt(globalTenantId, eventId) {
    const receipt = await db.edgeEventReceipt.findUnique({
      where: { globalTenantId_eventId: { globalTenantId, eventId } },
    });
    return receipt ? {
      eventId: receipt.eventId,
      status: receipt.status as SyncReceipt["status"],
      aggregateVersion: receipt.aggregateVersion,
    } : null;
  },
  async getAggregateVersion(globalTenantId, aggregateType, aggregateId) {
    return (await db.edgeAggregateProjection.findUnique({
      where: {
        globalTenantId_aggregateType_aggregateId: {
          globalTenantId, aggregateType, aggregateId,
        },
      },
      select: { version: true },
    }))?.version ?? 0;
  },
  apply(event) {
    return db.$transaction(async (tx) => {
      const prior = await tx.edgeEventReceipt.findUnique({
        where: {
          globalTenantId_eventId: {
            globalTenantId: event.globalTenantId,
            eventId: event.eventId,
          },
        },
      });
      if (prior) return {
        eventId: prior.eventId,
        status: prior.status as SyncReceipt["status"],
        aggregateVersion: prior.aggregateVersion,
      };
      const tenant = await tx.restTenant.findUniqueOrThrow({
        where: { globalTenantId: event.globalTenantId },
      });
      const aggregate = await tx.edgeAggregateProjection.findUnique({
        where: {
          globalTenantId_aggregateType_aggregateId: {
            globalTenantId: event.globalTenantId,
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
          },
        },
      });
      const current = aggregate?.version ?? 0;
      if (event.aggregateVersion !== current + 1) {
        throw new Error("AGGREGATE_VERSION_CONFLICT");
      }
      if (event.aggregateType === "TABLE") {
        const payload = z.object({
          status: z.enum(["AVAILABLE", "RESERVED", "OCCUPIED", "DIRTY", "CLEANING", "DISABLED"]),
        }).passthrough().parse(event.payload);
        const table = await tx.diningTable.findFirst({
          where: {
            id: event.aggregateId,
            globalTenantId: event.globalTenantId,
            branchId: event.branchId,
          },
        });
        if (!table || table.revision + 1 !== event.aggregateVersion) {
          throw new Error("AGGREGATE_VERSION_CONFLICT");
        }
        const transitions: Record<string, string[]> = {
          AVAILABLE: ["RESERVED", "OCCUPIED", "DISABLED"],
          RESERVED: ["OCCUPIED", "AVAILABLE"],
          OCCUPIED: ["DIRTY"],
          DIRTY: ["CLEANING"],
          CLEANING: ["AVAILABLE"],
          DISABLED: ["AVAILABLE"],
        };
        if (!transitions[table.status]?.includes(payload.status)) {
          throw new Error("EDGE_EVENT_TRANSITION_INVALID");
        }
        await tx.diningTable.update({
          where: { id: table.id },
          data: { status: payload.status, revision: event.aggregateVersion },
        });
      }
      if (event.aggregateType === "KITCHEN_TICKET") {
        const payload = z.object({
          status: z.enum(["QUEUED", "PREPARING", "READY", "SERVED", "CANCELLED"]),
        }).passthrough().parse(event.payload);
        const ticket = await tx.kitchenTicket.findFirst({
          where: {
            id: event.aggregateId,
            globalTenantId: event.globalTenantId,
            branchId: event.branchId,
          },
        });
        if (!ticket || ticket.revision + 1 !== event.aggregateVersion) {
          throw new Error("AGGREGATE_VERSION_CONFLICT");
        }
        const transitions: Record<string, string[]> = {
          QUEUED: ["PREPARING", "CANCELLED"],
          PREPARING: ["READY", "CANCELLED"],
          READY: ["SERVED"],
        };
        if (!transitions[ticket.status]?.includes(payload.status)) {
          throw new Error("EDGE_EVENT_TRANSITION_INVALID");
        }
        await tx.kitchenTicket.update({
          where: { id: ticket.id },
          data: {
            status: payload.status,
            revision: event.aggregateVersion,
            ...(payload.status === "PREPARING" ? { preparingAt: new Date() } : {}),
            ...(payload.status === "READY" ? { readyAt: new Date() } : {}),
            ...(payload.status === "SERVED" ? { servedAt: new Date() } : {}),
            ...(payload.status === "CANCELLED" ? { cancelledAt: new Date() } : {}),
          },
        });
        await tx.orderItem.update({
          where: { id: ticket.orderItemId },
          data: { status: payload.status, revision: { increment: 1 } },
        });
        const pending = await tx.kitchenTicket.count({
          where: {
            orderId: ticket.orderId,
            status: payload.status === "SERVED"
              ? { notIn: ["SERVED", "CANCELLED"] }
              : { notIn: ["READY", "SERVED", "CANCELLED"] },
          },
        });
        await tx.restaurantOrder.update({
          where: { id: ticket.orderId },
          data: {
            status: payload.status === "SERVED" && pending === 0 ? "SERVED"
              : payload.status === "READY" && pending === 0 ? "READY"
                : payload.status === "READY" ? "PARTIALLY_READY" : undefined,
            ...(payload.status === "SERVED" && pending === 0 ? { servedAt: new Date() } : {}),
            revision: { increment: 1 },
          },
        });
      }
      await tx.edgeAggregateProjection.upsert({
        where: {
          globalTenantId_aggregateType_aggregateId: {
            globalTenantId: event.globalTenantId,
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
          },
        },
        create: {
          restTenantId: tenant.id,
          globalTenantId: event.globalTenantId,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          version: event.aggregateVersion,
          state: event.payload as Prisma.InputJsonValue,
        },
        update: {
          version: event.aggregateVersion,
          state: event.payload as Prisma.InputJsonValue,
        },
      });
      await tx.edgeEventReceipt.create({
        data: {
          restTenantId: tenant.id,
          globalTenantId: event.globalTenantId,
          branchId: event.branchId,
          installationId: event.installationId,
          eventId: event.eventId,
          idempotencyKey: event.idempotencyKey,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          aggregateVersion: event.aggregateVersion,
          eventType: event.eventType,
          payload: event.payload as Prisma.InputJsonValue,
          status: "ACCEPTED",
          occurredAt: new Date(event.occurredAt),
        },
      });
      return {
        eventId: event.eventId,
        status: "ACCEPTED" as const,
        aggregateVersion: event.aggregateVersion,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },
};
