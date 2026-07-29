import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import type { TableRepository } from "./table-service";
import type { ReservationRepository } from "../reservations/reservation-service";

export const prismaTableRepository: TableRepository = {
  find(globalTenantId, branchId, tableId) {
    return db.diningTable.findFirst({
      where: { id: tableId, globalTenantId, branchId },
      select: {
        id: true, globalTenantId: true, branchId: true, status: true,
        revision: true, capacity: true, mergedIntoId: true,
      },
    });
  },
  create(input) {
    return db.$transaction(async (tx) => {
      const floor = await tx.diningFloor.findFirst({
        where: {
          id: input.floorId,
          globalTenantId: input.globalTenantId,
          branchId: input.branchId,
        },
      });
      if (!floor) throw new Error("REST_FLOOR_NOT_FOUND");
      if (input.zoneId && !await tx.diningZone.findFirst({
        where: { id: input.zoneId, floorId: input.floorId, globalTenantId: input.globalTenantId },
      })) throw new Error("REST_ZONE_NOT_FOUND");
      return tx.diningTable.create({ data: input });
    });
  },
  transition(input) {
    return db.$transaction(async (tx) => {
      const changed = await tx.diningTable.updateMany({
        where: {
          id: input.tableId,
          globalTenantId: input.globalTenantId,
          branchId: input.branchId,
          revision: input.expectedRevision,
          status: input.from,
        },
        data: { status: input.to, revision: { increment: 1 } },
      });
      if (changed.count !== 1) throw new Error("REST_TABLE_REVISION_CONFLICT");
      const commandId = [
        "table", input.tableId, input.expectedRevision, input.to,
      ].join(":");
      await tx.tableTransition.create({
        data: {
          globalTenantId: input.globalTenantId,
          branchId: input.branchId,
          tableId: input.tableId,
          fromStatus: input.from,
          toStatus: input.to,
          fromRevision: input.expectedRevision,
          toRevision: input.expectedRevision + 1,
          actorId: input.actorId,
          commandId,
        },
      });
      return tx.diningTable.findUniqueOrThrow({ where: { id: input.tableId } });
    });
  },
  merge(input) {
    return db.$transaction(async (tx) => {
      const groupId = randomUUID();
      const anchor = input.tableIds[0]!;
      for (const tableId of input.tableIds) {
        const changed = await tx.diningTable.updateMany({
          where: {
            id: tableId,
            globalTenantId: input.globalTenantId,
            branchId: input.branchId,
            status: "AVAILABLE",
            mergedIntoId: null,
          },
          data: {
            mergeGroupId: groupId,
            mergedIntoId: tableId === anchor ? null : anchor,
            revision: { increment: 1 },
          },
        });
        if (changed.count !== 1) throw new Error("REST_TABLE_MERGE_UNAVAILABLE");
      }
      return { groupId, anchorTableId: anchor, capacity: input.capacity };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },
  split(input) {
    return db.$transaction(async (tx) => {
      const anchor = await tx.diningTable.findFirst({
        where: {
          id: input.anchorTableId,
          globalTenantId: input.globalTenantId,
          branchId: input.branchId,
          status: "AVAILABLE",
        },
      });
      if (!anchor?.mergeGroupId) throw new Error("REST_TABLE_SPLIT_UNAVAILABLE");
      const result = await tx.diningTable.updateMany({
        where: {
          globalTenantId: input.globalTenantId,
          branchId: input.branchId,
          mergeGroupId: anchor.mergeGroupId,
          status: "AVAILABLE",
        },
        data: { mergeGroupId: null, mergedIntoId: null, revision: { increment: 1 } },
      });
      return { splitTables: result.count };
    });
  },
};

export const prismaReservationRepository: ReservationRepository = {
  getTables(globalTenantId, branchId, tableIds) {
    return db.diningTable.findMany({
      where: {
        id: { in: tableIds },
        globalTenantId,
        branchId,
        status: { not: "DISABLED" },
      },
      select: { id: true, capacity: true },
    });
  },
  async hasOverlap(input) {
    return Boolean(await db.reservation.findFirst({
      where: {
        globalTenantId: input.globalTenantId,
        branchId: input.branchId,
        status: { in: ["CONFIRMED", "SEATED"] },
        startsAt: { lt: input.endsAt },
        endsAt: { gt: input.startsAt },
        ...(input.excludeReservationId ? { id: { not: input.excludeReservationId } } : {}),
        tables: { some: { tableId: { in: input.tableIds } } },
      },
      select: { id: true },
    }));
  },
  create(input) {
    return db.$transaction(async (tx) => {
      const tenant = await tx.restTenant.findUniqueOrThrow({
        where: { globalTenantId: input.globalTenantId },
      });
      const tables = await tx.diningTable.findMany({
        where: {
          id: { in: input.tableIds },
          globalTenantId: input.globalTenantId,
          branchId: input.branchId,
          status: { not: "DISABLED" },
        },
      });
      if (tables.length !== input.tableIds.length) throw new Error("REST_RESERVATION_TABLE_NOT_FOUND");
      const overlap = await tx.reservation.findFirst({
        where: {
          globalTenantId: input.globalTenantId,
          branchId: input.branchId,
          status: { in: ["CONFIRMED", "SEATED"] },
          startsAt: { lt: new Date(input.endsAt) },
          endsAt: { gt: new Date(input.startsAt) },
          tables: { some: { tableId: { in: input.tableIds } } },
        },
      });
      if (overlap) throw new Error("REST_RESERVATION_OVERLAP");
      return tx.reservation.create({
        data: {
          restTenantId: tenant.id,
          globalTenantId: input.globalTenantId,
          branchId: input.branchId,
          guestName: input.guestName,
          guestPhone: input.guestPhone,
          partySize: input.partySize,
          startsAt: new Date(input.startsAt),
          endsAt: new Date(input.endsAt),
          notes: input.notes,
          createdBy: input.actorId,
          tables: {
            create: input.tableIds.map((tableId) => ({
              globalTenantId: input.globalTenantId,
              tableId,
            })),
          },
        },
        include: { tables: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },
  cancel(input) {
    return db.$transaction(async (tx) => {
      const changed = await tx.reservation.updateMany({
        where: {
          id: input.reservationId,
          globalTenantId: input.globalTenantId,
          branchId: input.branchId,
          revision: input.expectedRevision,
          status: "CONFIRMED",
        },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancellationReason: input.reason,
          revision: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw new Error("REST_RESERVATION_REVISION_CONFLICT");
      return tx.reservation.findUniqueOrThrow({ where: { id: input.reservationId } });
    });
  },
};
