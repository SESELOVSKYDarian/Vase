import {
  restSyncEventSchema,
  type RestSyncEvent,
} from "@vase/contracts";
import { Prisma } from "@prisma/client";
import { db } from "../db";

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
