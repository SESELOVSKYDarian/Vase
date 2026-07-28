import { Prisma } from "@prisma/client";
import { db } from "../db";
import type { CashRepository } from "./cash-service";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export const prismaCashRepository: CashRepository = {
  async findReceipt(globalTenantId, commandId) {
    return (await db.financialCommandReceipt.findUnique({
      where: { globalTenantId_commandId: { globalTenantId, commandId } },
    }))?.response ?? null;
  },
  findOpenDrawer(globalTenantId, branchId, stationId) {
    return db.cashDrawer.findFirst({
      where: { globalTenantId, branchId, stationId, status: "OPEN" },
      select: { id: true },
    });
  },
  async getDrawer(globalTenantId, branchId, drawerId) {
    const drawer = await db.cashDrawer.findFirst({
      where: { id: drawerId, globalTenantId, branchId },
    });
    return drawer ? {
      id: drawer.id,
      globalTenantId: drawer.globalTenantId,
      branchId: drawer.branchId,
      status: drawer.status,
      revision: drawer.revision,
      expectedCash: drawer.expectedCash.toFixed(2),
    } : null;
  },
  async execute(input) {
    return db.$transaction(async (tx) => {
      const tenant = await tx.restTenant.findUniqueOrThrow({
        where: { globalTenantId: String(input.globalTenantId) },
        select: { id: true },
      });
      if (input.action === "OPEN") {
        const openingFloat = new Prisma.Decimal(String(input.openingFloat));
        const drawer = await tx.cashDrawer.create({
          data: {
            restTenantId: tenant.id,
            globalTenantId: String(input.globalTenantId),
            branchId: String(input.branchId),
            stationId: String(input.stationId),
            openingFloat,
            expectedCash: openingFloat,
            openedBy: String(input.actorId),
          },
        });
        await tx.cashMovement.create({
          data: {
            restTenantId: tenant.id,
            globalTenantId: drawer.globalTenantId,
            branchId: drawer.branchId,
            drawerId: drawer.id,
            type: "OPENING",
            amount: openingFloat,
            balanceAfter: openingFloat,
            reason: "Apertura de caja",
            actorId: String(input.actorId),
            commandId: String(input.commandId),
          },
        });
        const response = {
          id: drawer.id,
          status: drawer.status,
          expectedCash: drawer.expectedCash.toFixed(2),
          revision: drawer.revision,
        };
        await tx.financialCommandReceipt.create({
          data: {
            restTenantId: tenant.id,
            globalTenantId: drawer.globalTenantId,
            commandId: String(input.commandId),
            response: json(response),
          },
        });
        return response;
      }
      const drawer = await tx.cashDrawer.findFirstOrThrow({
        where: {
          id: String(input.drawerId),
          globalTenantId: String(input.globalTenantId),
          branchId: String(input.branchId),
          status: "OPEN",
          revision: Number(input.expectedRevision),
        },
      });
      if (input.action === "MOVEMENT") {
        const amount = new Prisma.Decimal(String(input.signedAmount));
        const balanceAfter = drawer.expectedCash.add(amount);
        await tx.cashMovement.create({
          data: {
            restTenantId: tenant.id,
            globalTenantId: drawer.globalTenantId,
            branchId: drawer.branchId,
            drawerId: drawer.id,
            type: String(input.type),
            amount,
            balanceAfter,
            reason: String(input.reason),
            actorId: String(input.actorId),
            commandId: String(input.commandId),
          },
        });
        const updated = await tx.cashDrawer.update({
          where: { id: drawer.id },
          data: { expectedCash: balanceAfter, revision: { increment: 1 } },
        });
        const response = {
          id: updated.id,
          expectedCash: updated.expectedCash.toFixed(2),
          revision: updated.revision,
        };
        await tx.financialCommandReceipt.create({
          data: {
            restTenantId: tenant.id,
            globalTenantId: drawer.globalTenantId,
            commandId: String(input.commandId),
            response: json(response),
          },
        });
        return response;
      }
      if (input.action === "CLOSE") {
        const countedCash = new Prisma.Decimal(String(input.countedCash));
        const variance = countedCash.sub(drawer.expectedCash);
        const updated = await tx.cashDrawer.update({
          where: { id: drawer.id },
          data: {
            status: "CLOSED",
            countedCash,
            variance,
            closedBy: String(input.actorId),
            closedAt: new Date(),
            revision: { increment: 1 },
          },
        });
        await tx.cashMovement.create({
          data: {
            restTenantId: tenant.id,
            globalTenantId: drawer.globalTenantId,
            branchId: drawer.branchId,
            drawerId: drawer.id,
            type: "CLOSING",
            amount: new Prisma.Decimal(0),
            balanceAfter: drawer.expectedCash,
            reason: `Cierre con diferencia ${variance.toFixed(2)}`,
            actorId: String(input.actorId),
            commandId: String(input.commandId),
          },
        });
        const response = {
          id: updated.id,
          status: updated.status,
          expectedCash: updated.expectedCash.toFixed(2),
          countedCash: updated.countedCash?.toFixed(2),
          variance: updated.variance?.toFixed(2),
          revision: updated.revision,
        };
        await tx.financialCommandReceipt.create({
          data: {
            restTenantId: tenant.id,
            globalTenantId: drawer.globalTenantId,
            commandId: String(input.commandId),
            response: json(response),
          },
        });
        return response;
      }
      throw new Error("REST_CASH_ACTION_INVALID");
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },
};

