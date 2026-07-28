import { Prisma } from "@prisma/client";
import { db } from "../db";
import type { OrderRepository } from "./order-service";
import type { KitchenRepository } from "../kds/kitchen-service";
import { effectiveRecipeItems } from "../catalog/effective-recipe";
import { priceRestOrderItem, type RestPromotionCandidate } from "@vase/contracts";

type Command = Record<string, unknown> & {
  action: string; commandId: string; globalTenantId: string; branchId: string;
  actorId: string; orderId?: string; expectedRevision?: number;
};

async function nextOrderNumber(
  tx: Prisma.TransactionClient,
  globalTenantId: string,
  branchId: string,
) {
  const sequence = await tx.branchOrderSequence.upsert({
    where: { branchId },
    create: { globalTenantId, branchId, nextNumber: 2 },
    update: { nextNumber: { increment: 1 } },
  });
  return sequence.nextNumber - 1;
}

async function receipt(
  tx: Prisma.TransactionClient,
  input: Command,
  orderId: string,
  response: Record<string, unknown>,
) {
  await tx.orderCommandReceipt.create({
    data: {
      globalTenantId: input.globalTenantId,
      orderId,
      commandId: input.commandId,
      action: input.action,
      response: response as Prisma.InputJsonValue,
    },
  });
  return response;
}

async function recalculate(tx: Prisma.TransactionClient, orderId: string) {
  const items = await tx.orderItem.findMany({
    where: { orderId, status: { not: "CANCELLED" } },
    select: {
      lineTotal: true, netTotal: true, taxAmount: true, discountTotal: true,
    },
  });
  const subtotal = items.reduce((sum, item) => sum.plus(item.netTotal), new Prisma.Decimal(0));
  const taxTotal = items.reduce((sum, item) => sum.plus(item.taxAmount), new Prisma.Decimal(0));
  const total = items.reduce((sum, item) => sum.plus(item.lineTotal), new Prisma.Decimal(0));
  const discountTotal = items.reduce(
    (sum, item) => sum.plus(item.discountTotal),
    new Prisma.Decimal(0),
  );
  return tx.restaurantOrder.update({
    where: { id: orderId },
    data: { subtotal, discountTotal, taxTotal, total, revision: { increment: 1 } },
  });
}

async function consumeRecipes(
  tx: Prisma.TransactionClient,
  input: Command,
  order: { id: string; branchId: string },
) {
  const items = await tx.orderItem.findMany({
    where: { orderId: order.id, status: "DRAFT" },
    include: { product: { include: { recipeItems: true } } },
  });
  const branchGroupIds = (await tx.branchGroupMember.findMany({
    where: {
      globalTenantId: input.globalTenantId,
      branchId: order.branchId,
    },
    select: { branchGroupId: true },
  })).map((membership) => membership.branchGroupId);
  const scopedItems = items.map((item) => ({
    ...item,
    effectiveRecipe: effectiveRecipeItems({
      globalTenantId: input.globalTenantId,
      branchId: order.branchId,
      branchGroupIds,
      items: item.product.recipeItems.map((recipe) => ({
        scopeType: recipe.scopeType,
        scopeId: recipe.scopeId,
        scopeRevision: recipe.scopeRevision,
        value: recipe,
      })),
    }),
  }));
  const warehouseLink = await tx.warehouseBranch.findFirst({
    where: {
      globalTenantId: input.globalTenantId,
      branchId: order.branchId,
      warehouse: { active: true },
    },
    orderBy: { isDefault: "desc" },
  });
  const requiresInventory = scopedItems.some((item) => item.effectiveRecipe.length > 0);
  if (requiresInventory && !warehouseLink) throw new Error("REST_ORDER_WAREHOUSE_NOT_CONFIGURED");
  const quantities = new Map<string, Prisma.Decimal>();
  for (const item of scopedItems) {
    for (const recipe of item.effectiveRecipe) {
      const current = quantities.get(recipe.ingredientId) ?? new Prisma.Decimal(0);
      quantities.set(
        recipe.ingredientId,
        current.plus(recipe.quantity.mul(item.quantity)),
      );
    }
  }
  for (const [ingredientId, quantity] of quantities) {
    const balance = await tx.inventoryBalance.findUnique({
      where: {
        warehouseId_ingredientId: {
          warehouseId: warehouseLink!.warehouseId,
          ingredientId,
        },
      },
    });
    if (!balance || balance.onHand.lessThan(quantity)) {
      throw new Error("REST_ORDER_INVENTORY_INSUFFICIENT");
    }
    const next = balance.onHand.minus(quantity);
    await tx.inventoryBalance.update({
      where: { id: balance.id },
      data: { onHand: next, revision: { increment: 1 } },
    });
    await tx.inventoryMovement.create({
      data: {
        globalTenantId: input.globalTenantId,
        warehouseId: warehouseLink!.warehouseId,
        ingredientId,
        kind: "RECIPE_CONSUMPTION",
        quantity: quantity.negated(),
        balanceAfter: next,
        commandId: `${input.commandId}:ingredient:${ingredientId}`,
        actorId: input.actorId,
        referenceType: "ORDER",
        referenceId: order.id,
      },
    });
  }
}

export const prismaOrderRepository: OrderRepository = {
  findCommand(globalTenantId, commandId) {
    return db.orderCommandReceipt.findUnique({
      where: { globalTenantId_commandId: { globalTenantId, commandId } },
      select: { response: true },
    }).then((row) => row?.response ?? null);
  },
  getOrder(globalTenantId, branchId, orderId) {
    return db.restaurantOrder.findFirst({
      where: { id: orderId, globalTenantId, branchId },
      select: { id: true, globalTenantId: true, branchId: true, status: true, revision: true },
    });
  },
  execute(raw) {
    const input = raw as Command;
    return db.$transaction(async (tx) => {
      const prior = await tx.orderCommandReceipt.findUnique({
        where: {
          globalTenantId_commandId: {
            globalTenantId: input.globalTenantId,
            commandId: input.commandId,
          },
        },
      });
      if (prior) return prior.response;

      if (input.action === "OPEN") {
        const tenant = await tx.restTenant.findUniqueOrThrow({
          where: { globalTenantId: input.globalTenantId },
        });
        const tableId = input.tableId as string | undefined;
        const table = tableId ? await tx.diningTable.findFirst({
          where: {
            id: tableId,
            globalTenantId: input.globalTenantId,
            branchId: input.branchId,
            status: { in: ["AVAILABLE", "RESERVED"] },
          },
        }) : null;
        if (tableId && !table) throw new Error("REST_TABLE_UNAVAILABLE");
        if (table && table.capacity < Number(input.guestCount)) {
          throw new Error("REST_TABLE_CAPACITY_INSUFFICIENT");
        }
        if (table) {
          await tx.diningTable.update({
            where: { id: table.id },
            data: { status: "OCCUPIED", revision: { increment: 1 } },
          });
          await tx.tableTransition.create({
            data: {
              globalTenantId: input.globalTenantId,
              branchId: input.branchId,
              tableId: table.id,
              fromStatus: table.status,
              toStatus: "OCCUPIED",
              fromRevision: table.revision,
              toRevision: table.revision + 1,
              actorId: input.actorId,
              commandId: `${input.commandId}:table`,
            },
          });
        }
        const order = await tx.restaurantOrder.create({
          data: {
            restTenantId: tenant.id,
            globalTenantId: input.globalTenantId,
            branchId: input.branchId,
            tableId,
            orderNumber: await nextOrderNumber(tx, input.globalTenantId, input.branchId),
            guestCount: input.guestCount as number,
            openedBy: input.actorId,
          },
        });
        const response = {
          commandId: input.commandId,
          orderId: order.id,
          orderNumber: order.orderNumber,
          revision: order.revision,
          total: order.total.toFixed(2),
        };
        return receipt(tx, input, order.id, response);
      }

      const order = await tx.restaurantOrder.findFirst({
        where: {
          id: input.orderId,
          globalTenantId: input.globalTenantId,
          branchId: input.branchId,
          revision: input.expectedRevision,
        },
      });
      if (!order) throw new Error("REST_ORDER_REVISION_CONFLICT");

      if (input.action === "ADD_ITEM") {
        const product = await tx.menuProduct.findFirst({
          where: {
            id: input.productId as string,
            globalTenantId: input.globalTenantId,
            available: true,
          },
          include: {
            prices: true,
            modifierGroups: { include: { modifierGroup: true } },
          },
        });
        if (!product) throw new Error("REST_PRODUCT_NOT_FOUND");
        const availability = await tx.productBranchAvailability.findUnique({
          where: {
            productId_branchId: {
              productId: product.id,
              branchId: input.branchId,
            },
          },
        });
        if (availability && !availability.available) throw new Error("REST_PRODUCT_UNAVAILABLE");
        const groupIds = (await tx.branchGroupMember.findMany({
          where: { globalTenantId: input.globalTenantId, branchId: input.branchId },
          select: { branchGroupId: true },
        })).map((member) => member.branchGroupId);
        const [branch, promotions] = await Promise.all([
          tx.branch.findFirstOrThrow({
            where: {
              id: input.branchId,
              globalTenantId: input.globalTenantId,
            },
            select: { timezone: true },
          }),
          tx.promotion.findMany({
            where: {
              globalTenantId: input.globalTenantId,
              active: true,
            },
          }),
        ]);
        const branchPrice = product.prices.find((price) =>
          price.scopeType === "BRANCH" && price.scopeId === input.branchId);
        const groupPrice = product.prices.filter((price) =>
          price.scopeType === "BRANCH_GROUP" && groupIds.includes(price.scopeId))
          .sort((a, b) => b.revision - a.revision)[0];
        const tenantPrice = product.prices.find((price) =>
          price.scopeType === "TENANT" && price.scopeId === input.globalTenantId);
        const price = branchPrice ?? groupPrice ?? tenantPrice;
        if (!price) throw new Error("REST_PRODUCT_PRICE_NOT_CONFIGURED");
        const requestedModifiers = input.modifiers as Array<{ optionId: string; quantity: number }>;
        const options = await tx.modifierOption.findMany({
          where: {
            id: { in: requestedModifiers.map((modifier) => modifier.optionId) },
            globalTenantId: input.globalTenantId,
            active: true,
            modifierGroup: {
              products: { some: { productId: product.id } },
            },
          },
        });
        if (options.length !== new Set(requestedModifiers.map((modifier) => modifier.optionId)).size) {
          throw new Error("REST_MODIFIER_NOT_FOUND");
        }
        for (const link of product.modifierGroups) {
          const selected = requestedModifiers.filter((requested) =>
            options.some((option) =>
              option.id === requested.optionId &&
              option.modifierGroupId === link.modifierGroupId))
            .reduce((sum, requested) => sum + requested.quantity, 0);
          if (
            selected < link.modifierGroup.minSelections ||
            selected > link.modifierGroup.maxSelections
          ) throw new Error("REST_MODIFIER_SELECTION_INVALID");
        }
        const modifierTotal = requestedModifiers.reduce((sum, requested) => {
          const option = options.find((candidate) => candidate.id === requested.optionId)!;
          return sum.plus(option.priceDelta.mul(requested.quantity));
        }, new Prisma.Decimal(0));
        const quantity = input.quantity as number;
        const pricing = priceRestOrderItem({
          unitPrice: price.amount.toFixed(2),
          modifierTotal: modifierTotal.toFixed(2),
          quantity,
          taxRate: product.taxRate.toFixed(2),
          taxIncluded: product.taxIncluded,
          promotion: {
            now: new Date(),
            timezone: branch.timezone,
            globalTenantId: input.globalTenantId,
            branchId: input.branchId,
            branchGroupIds: groupIds,
            productId: product.id,
            paymentMethod: input.paymentMethod as string | undefined,
            promotions: promotions.map((promotion) => ({
              ...promotion,
              discountValue: promotion.discountValue.toFixed(4),
              productIds: promotion.productIds as string[],
              paymentMethods: promotion.paymentMethods as string[],
              weekdays: promotion.weekdays as number[],
            })) as RestPromotionCandidate[],
          },
        });
        const item = await tx.orderItem.create({
          data: {
            globalTenantId: input.globalTenantId,
            orderId: order.id,
            productId: product.id,
            skuSnapshot: product.sku,
            nameSnapshot: product.name,
            quantity,
            unitPrice: price.amount,
            modifierTotal,
            grossBeforeDiscount: pricing.grossBeforeDiscount,
            discountTotal: pricing.discountTotal,
            promotionIds: pricing.promotionIds,
            lineTotal: pricing.lineTotal,
            netTotal: pricing.netTotal,
            taxAmount: pricing.taxAmount,
            taxRate: product.taxRate,
            taxIncluded: product.taxIncluded,
            course: input.course as number,
            notes: input.notes as string | undefined,
            modifiers: {
              create: requestedModifiers.map((requested) => {
                const option = options.find((candidate) => candidate.id === requested.optionId)!;
                return {
                  globalTenantId: input.globalTenantId,
                  optionId: option.id,
                  nameSnapshot: option.name,
                  quantity: requested.quantity,
                  unitDelta: option.priceDelta,
                  totalDelta: option.priceDelta.mul(requested.quantity),
                };
              }),
            },
          },
        });
        const updated = await recalculate(tx, order.id);
        return receipt(tx, input, order.id, {
          commandId: input.commandId,
          orderId: order.id,
          itemId: item.id,
          revision: updated.revision,
          total: updated.total.toFixed(2),
        });
      }

      if (input.action === "SUBMIT") {
        const items = await tx.orderItem.findMany({
          where: { orderId: order.id, status: "DRAFT" },
          include: { product: true },
        });
        if (items.length === 0) throw new Error("REST_ORDER_EMPTY");
        const mappings = await tx.kitchenStationCategory.findMany({
          where: {
            globalTenantId: input.globalTenantId,
            categoryId: { in: items.map((item) => item.product.categoryId) },
            station: { branchId: input.branchId, active: true },
          },
          include: { station: true },
        });
        for (const item of items) {
          const mapping = mappings.find((candidate) =>
            candidate.categoryId === item.product.categoryId);
          if (!mapping) throw new Error("REST_KITCHEN_STATION_NOT_CONFIGURED");
        }
        await consumeRecipes(tx, input, order);
        for (const item of items) {
          const station = mappings.find((candidate) =>
            candidate.categoryId === item.product.categoryId)!.station;
          await tx.kitchenTicket.create({
            data: {
              globalTenantId: input.globalTenantId,
              branchId: input.branchId,
              orderId: order.id,
              orderItemId: item.id,
              stationId: station.id,
            },
          });
        }
        await tx.orderItem.updateMany({
          where: { orderId: order.id, status: "DRAFT" },
          data: { status: "QUEUED", revision: { increment: 1 } },
        });
        const updated = await tx.restaurantOrder.update({
          where: { id: order.id },
          data: { status: "SUBMITTED", submittedAt: new Date(), revision: { increment: 1 } },
        });
        return receipt(tx, input, order.id, {
          commandId: input.commandId, orderId: order.id,
          revision: updated.revision, ticketsCreated: items.length,
        });
      }

      if (input.action === "CANCEL") {
        const consumptions = await tx.inventoryMovement.findMany({
          where: {
            globalTenantId: input.globalTenantId,
            referenceType: "ORDER",
            referenceId: order.id,
            kind: "RECIPE_CONSUMPTION",
            reversedBy: null,
          },
        });
        for (const movement of consumptions) {
          const balance = await tx.inventoryBalance.findUniqueOrThrow({
            where: {
              warehouseId_ingredientId: {
                warehouseId: movement.warehouseId,
                ingredientId: movement.ingredientId,
              },
            },
          });
          const next = balance.onHand.minus(movement.quantity);
          await tx.inventoryBalance.update({
            where: { id: balance.id },
            data: { onHand: next, revision: { increment: 1 } },
          });
          await tx.inventoryMovement.create({
            data: {
              globalTenantId: input.globalTenantId,
              warehouseId: movement.warehouseId,
              ingredientId: movement.ingredientId,
              kind: "REVERSAL",
              quantity: movement.quantity.negated(),
              balanceAfter: next,
              commandId: `${input.commandId}:restore:${movement.ingredientId}`,
              actorId: input.actorId,
              reason: input.reason as string,
              reversalOfId: movement.id,
              referenceType: "ORDER",
              referenceId: order.id,
            },
          });
        }
        await tx.kitchenTicket.updateMany({
          where: { orderId: order.id, status: { in: ["QUEUED", "PREPARING"] } },
          data: { status: "CANCELLED", cancelledAt: new Date(), revision: { increment: 1 } },
        });
        await tx.orderItem.updateMany({
          where: { orderId: order.id, status: { not: "SERVED" } },
          data: { status: "CANCELLED", revision: { increment: 1 } },
        });
        const updated = await tx.restaurantOrder.update({
          where: { id: order.id },
          data: {
            status: "CANCELLED", cancelledAt: new Date(),
            cancellationReason: input.reason as string,
            revision: { increment: 1 },
          },
        });
        return receipt(tx, input, order.id, {
          commandId: input.commandId, orderId: order.id, revision: updated.revision,
        });
      }

      if (input.action === "SPLIT") {
        const itemIds = input.itemIds as string[];
        const count = await tx.orderItem.count({
          where: { id: { in: itemIds }, orderId: order.id, status: "DRAFT" },
        });
        if (count !== new Set(itemIds).size) throw new Error("REST_ORDER_SPLIT_ITEM_INVALID");
        const split = await tx.restaurantOrder.create({
          data: {
            restTenantId: order.restTenantId,
            globalTenantId: input.globalTenantId,
            branchId: input.branchId,
            tableId: order.tableId,
            orderNumber: await nextOrderNumber(tx, input.globalTenantId, input.branchId),
            guestCount: order.guestCount,
            openedBy: input.actorId,
          },
        });
        await tx.orderItem.updateMany({
          where: { id: { in: itemIds }, orderId: order.id },
          data: { orderId: split.id },
        });
        const [source, target] = await Promise.all([
          recalculate(tx, order.id),
          recalculate(tx, split.id),
        ]);
        return receipt(tx, input, order.id, {
          commandId: input.commandId, orderId: order.id,
          splitOrderId: split.id, revision: source.revision,
          splitRevision: target.revision,
        });
      }

      if (input.action === "MERGE") {
        const sourceId = input.sourceOrderId as string;
        const source = await tx.restaurantOrder.findFirst({
          where: {
            id: sourceId,
            globalTenantId: input.globalTenantId,
            branchId: input.branchId,
            status: "OPEN",
          },
        });
        if (!source) throw new Error("REST_ORDER_SOURCE_INVALID");
        await tx.orderItem.updateMany({
          where: { orderId: source.id, status: "DRAFT" },
          data: { orderId: order.id },
        });
        const updated = await recalculate(tx, order.id);
        await tx.restaurantOrder.update({
          where: { id: source.id },
          data: { status: "MERGED", revision: { increment: 1 } },
        });
        return receipt(tx, input, order.id, {
          commandId: input.commandId, orderId: order.id, revision: updated.revision,
          mergedOrderId: source.id, total: updated.total.toFixed(2),
        });
      }

      throw new Error("REST_ORDER_ACTION_INVALID");
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },
};

export const prismaKitchenRepository: KitchenRepository = {
  findTicket(globalTenantId, branchId, ticketId) {
    return db.kitchenTicket.findFirst({
      where: { id: ticketId, globalTenantId, branchId },
      select: { id: true, globalTenantId: true, branchId: true, status: true, revision: true },
    });
  },
  setPriority(input) {
    return db.$transaction(async (tx) => {
      const duplicate = await tx.kitchenTicketTransition.findUnique({
        where: {
          globalTenantId_commandId: {
            globalTenantId: input.globalTenantId,
            commandId: input.commandId,
          },
        },
      });
      if (duplicate) {
        return tx.kitchenTicket.findUniqueOrThrow({ where: { id: duplicate.ticketId } });
      }
      const current = await tx.kitchenTicket.findFirst({
        where: {
          id: input.ticketId,
          globalTenantId: input.globalTenantId,
          branchId: input.branchId,
          revision: input.expectedRevision,
        },
      });
      if (!current) throw new Error("REST_KDS_REVISION_CONFLICT");
      const ticket = await tx.kitchenTicket.update({
        where: { id: current.id },
        data: { priority: input.priority, revision: { increment: 1 } },
      });
      await tx.kitchenTicketTransition.create({
        data: {
          globalTenantId: input.globalTenantId, ticketId: input.ticketId,
          fromStatus: current.status, toStatus: current.status,
          fromRevision: input.expectedRevision, toRevision: input.expectedRevision + 1,
          commandId: input.commandId, actorId: input.actorId,
        },
      });
      return ticket;
    });
  },
  transition(input) {
    return db.$transaction(async (tx) => {
      const duplicate = await tx.kitchenTicketTransition.findUnique({
        where: {
          globalTenantId_commandId: {
            globalTenantId: input.globalTenantId,
            commandId: input.commandId,
          },
        },
      });
      if (duplicate) return tx.kitchenTicket.findUniqueOrThrow({ where: { id: duplicate.ticketId } });
      const changed = await tx.kitchenTicket.updateMany({
        where: {
          id: input.ticketId, globalTenantId: input.globalTenantId,
          branchId: input.branchId, revision: input.expectedRevision, status: input.from,
        },
        data: {
          status: input.to,
          revision: { increment: 1 },
          ...(input.to === "PREPARING" ? { preparingAt: new Date() } : {}),
          ...(["READY", "SERVED"].includes(input.from) && input.to === "PREPARING"
            ? {
                recalledAt: new Date(), recallReason: input.recallReason,
                servedAt: null, readyAt: null,
              }
            : {}),
          ...(input.to === "READY" ? { readyAt: new Date() } : {}),
          ...(input.to === "CANCELLED" ? { cancelledAt: new Date() } : {}),
        },
      });
      if (changed.count !== 1) throw new Error("REST_KDS_REVISION_CONFLICT");
      const ticket = await tx.kitchenTicket.findUniqueOrThrow({ where: { id: input.ticketId } });
      await tx.orderItem.update({
        where: { id: ticket.orderItemId },
        data: { status: input.to, revision: { increment: 1 } },
      });
      if (["READY", "SERVED"].includes(input.from) && input.to === "PREPARING") {
        await tx.restaurantOrder.update({
          where: { id: ticket.orderId },
          data: { status: "SUBMITTED", servedAt: null, revision: { increment: 1 } },
        });
      }
      await tx.kitchenTicketTransition.create({
        data: {
          globalTenantId: input.globalTenantId, ticketId: input.ticketId,
          fromStatus: input.from, toStatus: input.to,
          fromRevision: input.expectedRevision, toRevision: input.expectedRevision + 1,
          commandId: input.commandId, actorId: input.actorId,
        },
      });
      if (input.to === "READY") {
        const pending = await tx.kitchenTicket.count({
          where: { orderId: ticket.orderId, status: { notIn: ["READY", "SERVED", "CANCELLED"] } },
        });
        await tx.restaurantOrder.update({
          where: { id: ticket.orderId },
          data: { status: pending === 0 ? "READY" : "PARTIALLY_READY", revision: { increment: 1 } },
        });
      }
      return ticket;
    });
  },
  markServed(input) {
    return db.$transaction(async (tx) => {
      const changed = await tx.kitchenTicket.updateMany({
        where: {
          id: input.ticketId, globalTenantId: input.globalTenantId,
          branchId: input.branchId, revision: input.expectedRevision, status: "READY",
        },
        data: { status: "SERVED", servedAt: new Date(), revision: { increment: 1 } },
      });
      if (changed.count !== 1) throw new Error("REST_KDS_REVISION_CONFLICT");
      const ticket = await tx.kitchenTicket.findUniqueOrThrow({ where: { id: input.ticketId } });
      await tx.orderItem.update({
        where: { id: ticket.orderItemId },
        data: { status: "SERVED", revision: { increment: 1 } },
      });
      await tx.kitchenTicketTransition.create({
        data: {
          globalTenantId: input.globalTenantId, ticketId: input.ticketId,
          fromStatus: "READY", toStatus: "SERVED",
          fromRevision: input.expectedRevision, toRevision: input.expectedRevision + 1,
          commandId: input.commandId, actorId: input.actorId,
        },
      });
      const pending = await tx.kitchenTicket.count({
        where: { orderId: ticket.orderId, status: { notIn: ["SERVED", "CANCELLED"] } },
      });
      if (pending === 0) {
        await tx.restaurantOrder.update({
          where: { id: ticket.orderId },
          data: { status: "SERVED", servedAt: new Date(), revision: { increment: 1 } },
        });
      }
      return ticket;
    });
  },
};
