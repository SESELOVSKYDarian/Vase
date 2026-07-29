import { Prisma } from "@prisma/client";
import { db } from "../db";
import type { InventoryRepository } from "./inventory-service";
import type { AllocationRepository } from "./allocation-service";

export const prismaInventoryRepository: InventoryRepository = {
  append(input) {
    return db.$transaction(async (tx) => {
      const duplicate = await tx.inventoryMovement.findUnique({
        where: {
          globalTenantId_commandId: {
            globalTenantId: input.globalTenantId,
            commandId: input.commandId,
          },
        },
      });
      if (duplicate) return {
        movementId: duplicate.id,
        balance: duplicate.balanceAfter.toFixed(),
      };
      const warehouse = await tx.warehouse.findFirst({
        where: { id: input.warehouseId, globalTenantId: input.globalTenantId, active: true },
      });
      const ingredient = await tx.ingredient.findFirst({
        where: { id: input.ingredientId, globalTenantId: input.globalTenantId, active: true },
      });
      if (!warehouse || !ingredient) throw new Error("REST_INVENTORY_TARGET_NOT_FOUND");
      const current = await tx.inventoryBalance.findUnique({
        where: {
          warehouseId_ingredientId: {
            warehouseId: input.warehouseId,
            ingredientId: input.ingredientId,
          },
        },
      });
      const next = new Prisma.Decimal(current?.onHand ?? 0).plus(input.quantity);
      if (next.isNegative()) throw new Error("REST_INVENTORY_INSUFFICIENT");
      const balance = await tx.inventoryBalance.upsert({
        where: {
          warehouseId_ingredientId: {
            warehouseId: input.warehouseId,
            ingredientId: input.ingredientId,
          },
        },
        create: {
          globalTenantId: input.globalTenantId,
          warehouseId: input.warehouseId,
          ingredientId: input.ingredientId,
          onHand: next,
        },
        update: { onHand: next, revision: { increment: 1 } },
      });
      const movement = await tx.inventoryMovement.create({
        data: {
          ...input,
          quantity: input.quantity,
          balanceAfter: balance.onHand,
        },
      });
      return { movementId: movement.id, balance: balance.onHand.toFixed() };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },
  findMovement(globalTenantId, movementId) {
    return db.inventoryMovement.findFirst({
      where: { id: movementId, globalTenantId },
      select: { id: true, globalTenantId: true, reversedBy: { select: { id: true } } },
    }).then((movement) => movement ? ({
      id: movement.id,
      globalTenantId: movement.globalTenantId,
      reversedById: movement.reversedBy?.id ?? null,
    }) : null);
  },
  reverse(input) {
    return db.$transaction(async (tx) => {
      const duplicate = await tx.inventoryMovement.findUnique({
        where: {
          globalTenantId_commandId: {
            globalTenantId: input.globalTenantId,
            commandId: input.commandId,
          },
        },
      });
      if (duplicate) return { movementId: duplicate.id };
      const original = await tx.inventoryMovement.findFirst({
        where: {
          id: input.originalMovementId,
          globalTenantId: input.globalTenantId,
          reversedBy: null,
        },
      });
      if (!original) throw new Error("REST_INVENTORY_ALREADY_REVERSED");
      const balance = await tx.inventoryBalance.findUniqueOrThrow({
        where: {
          warehouseId_ingredientId: {
            warehouseId: original.warehouseId,
            ingredientId: original.ingredientId,
          },
        },
      });
      const next = balance.onHand.minus(original.quantity);
      if (next.isNegative()) throw new Error("REST_INVENTORY_REVERSAL_INSUFFICIENT");
      await tx.inventoryBalance.update({
        where: { id: balance.id },
        data: { onHand: next, revision: { increment: 1 } },
      });
      const reversal = await tx.inventoryMovement.create({
        data: {
          globalTenantId: input.globalTenantId,
          warehouseId: original.warehouseId,
          ingredientId: original.ingredientId,
          kind: "REVERSAL",
          quantity: original.quantity.negated(),
          balanceAfter: next,
          commandId: input.commandId,
          actorId: input.actorId,
          reason: input.reason,
          reversalOfId: original.id,
        },
      });
      return { movementId: reversal.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },
};

export const prismaAllocationRepository: AllocationRepository = {
  get(globalTenantId, branchId, ingredientId) {
    return db.branchInventoryAllocation.findUnique({
      where: { branchId_ingredientId: { branchId, ingredientId } },
    }).then((allocation) => allocation && allocation.globalTenantId === globalTenantId ? ({
      globalTenantId,
      branchId,
      warehouseId: allocation.warehouseId,
      ingredientId,
      available: allocation.available.toFixed(),
      safetyStock: allocation.safetyStock.toFixed(),
      revision: allocation.revision,
    }) : null);
  },
  reserve(input) {
    return db.$transaction(async (tx) => {
      const duplicate = await tx.allocationConsumption.findUnique({
        where: {
          globalTenantId_commandId: {
            globalTenantId: input.globalTenantId,
            commandId: input.commandId,
          },
        },
      });
      if (duplicate) return { remaining: duplicate.remainingAfter.toFixed() };
      const allocation = await tx.branchInventoryAllocation.findUniqueOrThrow({
        where: {
          branchId_ingredientId: {
            branchId: input.branchId,
            ingredientId: input.ingredientId,
          },
        },
      });
      if (
        allocation.globalTenantId !== input.globalTenantId ||
        allocation.revision !== input.expectedRevision
      ) throw new Error("REST_INVENTORY_REVISION_CONFLICT");
      const remaining = allocation.available.minus(input.quantity);
      if (remaining.lessThan(allocation.safetyStock)) {
        throw new Error("REST_OFFLINE_ALLOCATION_EXHAUSTED");
      }
      const updated = await tx.branchInventoryAllocation.update({
        where: { id: allocation.id },
        data: { available: remaining, revision: { increment: 1 } },
      });
      await tx.allocationConsumption.create({
        data: {
          globalTenantId: input.globalTenantId,
          allocationId: allocation.id,
          commandId: input.commandId,
          quantity: input.quantity,
          remainingAfter: remaining,
        },
      });
      return { remaining: updated.available.toFixed() };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },
};
