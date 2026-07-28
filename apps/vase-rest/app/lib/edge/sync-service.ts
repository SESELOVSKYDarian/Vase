import {
  restSyncEventSchema,
  type RestSyncEvent,
} from "@vase/contracts";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { z } from "zod";
import { effectiveRecipeItems } from "../catalog/effective-recipe";
import { priceRestOrderItem, type RestPromotionCandidate } from "@vase/contracts";

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
      if (event.aggregateType === "ORDER") {
        if (event.eventType === "ORDER_OPENED") {
          const payload = z.object({
            tableId: z.string().min(1).optional(),
            guestCount: z.number().int().positive().max(500),
            openedAt: z.iso.datetime(),
          }).strict().parse(event.payload);
          if (await tx.restaurantOrder.findUnique({
            where: { id: event.aggregateId },
          })) throw new Error("EDGE_ORDER_ALREADY_EXISTS");
          const branch = await tx.branch.findFirst({
            where: {
              id: event.branchId,
              globalTenantId: event.globalTenantId,
              active: true,
            },
          });
          if (!branch) throw new Error("REST_BRANCH_NOT_FOUND");
          if (payload.tableId && !await tx.diningTable.findFirst({
            where: {
              id: payload.tableId,
              globalTenantId: event.globalTenantId,
              branchId: event.branchId,
            },
          })) throw new Error("REST_TABLE_NOT_FOUND");
          const sequence = await tx.branchOrderSequence.upsert({
            where: { branchId: event.branchId },
            create: {
              globalTenantId: event.globalTenantId,
              branchId: event.branchId,
              nextNumber: 2,
            },
            update: { nextNumber: { increment: 1 } },
          });
          await tx.restaurantOrder.create({
            data: {
              id: event.aggregateId,
              restTenantId: tenant.id,
              globalTenantId: event.globalTenantId,
              branchId: event.branchId,
              tableId: payload.tableId,
              orderNumber: sequence.nextNumber - 1,
              guestCount: payload.guestCount,
              openedBy: event.actorId,
              revision: event.aggregateVersion,
              createdAt: new Date(payload.openedAt),
            },
          });
        } else if (event.eventType === "ORDER_ITEM_ADDED") {
          const payload = z.object({
            id: z.string().min(1),
            productId: z.string().min(1),
            categoryId: z.string().min(1),
            skuSnapshot: z.string().min(1),
            nameSnapshot: z.string().min(1),
            quantity: z.number().int().positive(),
            unitPrice: z.string(),
            modifierTotal: z.string(),
            grossBeforeDiscount: z.string(),
            discountTotal: z.string(),
            promotionIds: z.array(z.string()),
            lineTotal: z.string(),
            netTotal: z.string(),
            taxAmount: z.string(),
            taxRate: z.string(),
            taxIncluded: z.boolean(),
            course: z.number().int().positive(),
            notes: z.string().optional(),
            paymentMethod: z.string().optional(),
            modifiers: z.array(z.object({
              optionId: z.string().min(1),
              nameSnapshot: z.string().min(1),
              quantity: z.number().int().positive(),
              unitDelta: z.string(),
              totalDelta: z.string(),
            }).strict()),
            catalogRevision: z.number().int().positive(),
            stationId: z.string().optional(),
            recipeItems: z.array(z.object({
              ingredientId: z.string(),
              quantity: z.string(),
            })).optional(),
          }).passthrough().parse(event.payload);
          const order = await tx.restaurantOrder.findFirst({
            where: {
              id: event.aggregateId,
              globalTenantId: event.globalTenantId,
              branchId: event.branchId,
              status: "OPEN",
              revision: event.aggregateVersion - 1,
            },
          });
          if (!order) throw new Error("REST_ORDER_REVISION_CONFLICT");
          const product = await tx.menuProduct.findFirst({
            where: {
              id: payload.productId,
              globalTenantId: event.globalTenantId,
              available: true,
            },
            include: {
              prices: true,
              branchAvailability: {
                where: { branchId: event.branchId },
              },
              modifierGroups: {
                include: {
                  modifierGroup: { include: { options: true } },
                },
              },
            },
          });
          if (
            !product ||
            product.sku !== payload.skuSnapshot ||
            product.name !== payload.nameSnapshot ||
            product.categoryId !== payload.categoryId
          ) throw new Error("EDGE_ORDER_PRODUCT_SNAPSHOT_INVALID");
          if (product.branchAvailability[0]?.available === false) {
            throw new Error("REST_PRODUCT_UNAVAILABLE");
          }
          const groupIds = (await tx.branchGroupMember.findMany({
            where: {
              globalTenantId: event.globalTenantId,
              branchId: event.branchId,
            },
            select: { branchGroupId: true },
          })).map((member) => member.branchGroupId);
          const [branch, promotions] = await Promise.all([
            tx.branch.findFirstOrThrow({
              where: {
                id: event.branchId,
                globalTenantId: event.globalTenantId,
              },
              select: { timezone: true },
            }),
            tx.promotion.findMany({
              where: {
                globalTenantId: event.globalTenantId,
                active: true,
              },
            }),
          ]);
          const price = product.prices.find((candidate) =>
            candidate.scopeType === "BRANCH" && candidate.scopeId === event.branchId) ??
            product.prices.filter((candidate) =>
              candidate.scopeType === "BRANCH_GROUP" &&
              groupIds.includes(candidate.scopeId))
              .sort((left, right) =>
                right.revision - left.revision ||
                left.scopeId.localeCompare(right.scopeId))[0] ??
            product.prices.find((candidate) =>
              candidate.scopeType === "TENANT" &&
              candidate.scopeId === event.globalTenantId);
          if (!price) throw new Error("REST_PRODUCT_PRICE_NOT_CONFIGURED");
          const allowedOptions = product.modifierGroups.flatMap((link) =>
            link.modifierGroup.options.filter((option) => option.active));
          const optionIds = payload.modifiers.map((item) => item.optionId);
          if (
            new Set(optionIds).size !== optionIds.length ||
            payload.modifiers.some((modifier) =>
              !allowedOptions.some((option) => option.id === modifier.optionId))
          ) {
            throw new Error("REST_MODIFIER_NOT_FOUND");
          }
          for (const link of product.modifierGroups) {
            const selected = payload.modifiers.filter((modifier) =>
              allowedOptions.some((option) =>
                option.id === modifier.optionId &&
                option.modifierGroupId === link.modifierGroupId))
              .reduce((sum, modifier) => sum + modifier.quantity, 0);
            if (
              selected < link.modifierGroup.minSelections ||
              selected > link.modifierGroup.maxSelections
            ) throw new Error("REST_MODIFIER_SELECTION_INVALID");
          }
          const modifierTotal = payload.modifiers.reduce((sum, modifier) => {
            const option = allowedOptions.find((candidate) =>
              candidate.id === modifier.optionId)!;
            const total = option.priceDelta.mul(modifier.quantity);
            if (
              option.name !== modifier.nameSnapshot ||
              !option.priceDelta.equals(modifier.unitDelta) ||
              !total.equals(modifier.totalDelta)
            ) throw new Error("EDGE_MODIFIER_SNAPSHOT_INVALID");
            return sum.add(total);
          }, new Prisma.Decimal(0));
          const pricing = priceRestOrderItem({
            unitPrice: price.amount.toFixed(2),
            modifierTotal: modifierTotal.toFixed(2),
            quantity: payload.quantity,
            taxRate: product.taxRate.toFixed(2),
            taxIncluded: product.taxIncluded,
            promotion: {
              now: new Date(event.occurredAt),
              timezone: branch.timezone,
              globalTenantId: event.globalTenantId,
              branchId: event.branchId,
              branchGroupIds: groupIds,
              productId: product.id,
              paymentMethod: payload.paymentMethod,
              promotions: promotions.map((promotion) => ({
                ...promotion,
                discountValue: promotion.discountValue.toFixed(4),
                productIds: promotion.productIds as string[],
                paymentMethods: promotion.paymentMethods as string[],
                weekdays: promotion.weekdays as number[],
              })) as RestPromotionCandidate[],
            },
          });
          const expected = {
            unitPrice: price.amount,
            modifierTotal,
            ...pricing,
          };
          if (
            !expected.unitPrice.equals(payload.unitPrice) ||
            !expected.modifierTotal.equals(payload.modifierTotal) ||
            expected.grossBeforeDiscount !== payload.grossBeforeDiscount ||
            expected.discountTotal !== payload.discountTotal ||
            JSON.stringify(expected.promotionIds) !== JSON.stringify(payload.promotionIds) ||
            expected.lineTotal !== payload.lineTotal ||
            expected.netTotal !== payload.netTotal ||
            expected.taxAmount !== payload.taxAmount ||
            !product.taxRate.equals(payload.taxRate) ||
            product.taxIncluded !== payload.taxIncluded
          ) throw new Error("EDGE_ORDER_TOTAL_MISMATCH");
          await tx.orderItem.create({
            data: {
              id: payload.id,
              globalTenantId: event.globalTenantId,
              orderId: order.id,
              productId: product.id,
              skuSnapshot: payload.skuSnapshot,
              nameSnapshot: payload.nameSnapshot,
              quantity: payload.quantity,
              unitPrice: payload.unitPrice,
              modifierTotal: payload.modifierTotal,
              grossBeforeDiscount: payload.grossBeforeDiscount,
              discountTotal: payload.discountTotal,
              promotionIds: payload.promotionIds,
              lineTotal: payload.lineTotal,
              netTotal: payload.netTotal,
              taxAmount: payload.taxAmount,
              taxRate: payload.taxRate,
              taxIncluded: payload.taxIncluded,
              course: payload.course,
              notes: payload.notes,
              modifiers: {
                create: payload.modifiers.map((modifier) => ({
                  globalTenantId: event.globalTenantId,
                  optionId: modifier.optionId,
                  nameSnapshot: modifier.nameSnapshot,
                  quantity: modifier.quantity,
                  unitDelta: modifier.unitDelta,
                  totalDelta: modifier.totalDelta,
                })),
              },
            },
          });
          await tx.restaurantOrder.update({
            where: { id: order.id },
            data: {
              subtotal: order.subtotal.add(payload.netTotal),
              discountTotal: order.discountTotal.add(payload.discountTotal),
              taxTotal: order.taxTotal.add(payload.taxAmount),
              total: order.total.add(payload.lineTotal),
              revision: event.aggregateVersion,
            },
          });
        } else if (event.eventType === "ORDER_SUBMITTED") {
          const payload = z.object({
            submittedAt: z.iso.datetime(),
            tickets: z.array(z.object({
              id: z.string().min(1),
              orderItemId: z.string().min(1),
              stationId: z.string().min(1),
            }).strict()).min(1),
            consumptions: z.array(z.object({
              allocationId: z.string().min(1),
              ingredientId: z.string().min(1),
              warehouseId: z.string().min(1),
              quantity: z.string(),
              remainingAfter: z.string(),
              expectedRevision: z.number().int().nonnegative(),
            }).strict()),
          }).strict().parse(event.payload);
          const order = await tx.restaurantOrder.findFirst({
            where: {
              id: event.aggregateId,
              globalTenantId: event.globalTenantId,
              branchId: event.branchId,
              status: "OPEN",
              revision: event.aggregateVersion - 1,
            },
            include: {
              items: {
                where: { status: "DRAFT" },
                include: { product: { include: { recipeItems: true } } },
              },
            },
          });
          if (!order || !order.items.length) {
            throw new Error("REST_ORDER_REVISION_CONFLICT");
          }
          if (
            payload.tickets.length !== order.items.length ||
            order.items.some((item) => !payload.tickets.some((ticket) =>
              ticket.orderItemId === item.id))
          ) throw new Error("EDGE_KITCHEN_TICKET_SET_INVALID");
          const mappings = await tx.kitchenStationCategory.findMany({
            where: {
              globalTenantId: event.globalTenantId,
              categoryId: {
                in: order.items.map((item) => item.product.categoryId),
              },
              station: { branchId: event.branchId, active: true },
            },
          });
          for (const item of order.items) {
            const mapping = mappings.find((candidate) =>
              candidate.categoryId === item.product.categoryId);
            const ticket = payload.tickets.find((candidate) =>
              candidate.orderItemId === item.id);
            if (!mapping || ticket?.stationId !== mapping.stationId) {
              throw new Error("EDGE_KITCHEN_STATION_MISMATCH");
            }
          }
          const required = new Map<string, Prisma.Decimal>();
          const branchGroupIds = (await tx.branchGroupMember.findMany({
            where: {
              globalTenantId: event.globalTenantId,
              branchId: event.branchId,
            },
            select: { branchGroupId: true },
          })).map((membership) => membership.branchGroupId);
          for (const item of order.items) {
            const recipeItems = effectiveRecipeItems({
              globalTenantId: event.globalTenantId,
              branchId: event.branchId,
              branchGroupIds,
              items: item.product.recipeItems.map((recipe) => ({
                scopeType: recipe.scopeType,
                scopeId: recipe.scopeId,
                scopeRevision: recipe.scopeRevision,
                value: recipe,
              })),
            });
            for (const recipe of recipeItems) {
              required.set(
                recipe.ingredientId,
                (required.get(recipe.ingredientId) ?? new Prisma.Decimal(0))
                  .add(recipe.quantity.mul(item.quantity)),
              );
            }
          }
          if (
            payload.consumptions.length !== required.size ||
            [...required].some(([ingredientId, quantity]) => {
              const provided = payload.consumptions.find((item) =>
                item.ingredientId === ingredientId);
              return !provided ||
                !new Prisma.Decimal(provided.quantity).equals(quantity);
            })
          ) throw new Error("EDGE_INVENTORY_CONSUMPTION_MISMATCH");
          for (const consumption of payload.consumptions) {
            const allocation = await tx.branchInventoryAllocation.findFirst({
              where: {
                id: consumption.allocationId,
                globalTenantId: event.globalTenantId,
                branchId: event.branchId,
                ingredientId: consumption.ingredientId,
                warehouseId: consumption.warehouseId,
                revision: consumption.expectedRevision,
              },
            });
            const quantity = new Prisma.Decimal(consumption.quantity);
            if (
              !allocation ||
              allocation.available.sub(quantity).lessThan(allocation.safetyStock) ||
              !allocation.available.sub(quantity).equals(consumption.remainingAfter)
            ) throw new Error("EDGE_INVENTORY_ALLOCATION_CONFLICT");
            const balance = await tx.inventoryBalance.findUnique({
              where: {
                warehouseId_ingredientId: {
                  warehouseId: allocation.warehouseId,
                  ingredientId: allocation.ingredientId,
                },
              },
            });
            if (!balance || balance.onHand.lessThan(quantity)) {
              throw new Error("REST_ORDER_INVENTORY_INSUFFICIENT");
            }
            await tx.branchInventoryAllocation.update({
              where: { id: allocation.id },
              data: {
                available: allocation.available.sub(quantity),
                revision: { increment: 1 },
              },
            });
            await tx.allocationConsumption.create({
              data: {
                globalTenantId: event.globalTenantId,
                allocationId: allocation.id,
                commandId: `${event.idempotencyKey}:allocation:${allocation.id}`,
                quantity,
                remainingAfter: allocation.available.sub(quantity),
              },
            });
            await tx.inventoryBalance.update({
              where: { id: balance.id },
              data: {
                onHand: balance.onHand.sub(quantity),
                revision: { increment: 1 },
              },
            });
            await tx.inventoryMovement.create({
              data: {
                globalTenantId: event.globalTenantId,
                warehouseId: allocation.warehouseId,
                ingredientId: allocation.ingredientId,
                kind: "RECIPE_CONSUMPTION",
                quantity: quantity.negated(),
                balanceAfter: balance.onHand.sub(quantity),
                commandId: `${event.idempotencyKey}:ingredient:${allocation.ingredientId}`,
                actorId: event.actorId,
                referenceType: "ORDER",
                referenceId: order.id,
              },
            });
          }
          await tx.kitchenTicket.createMany({
            data: payload.tickets.map((ticket) => ({
              id: ticket.id,
              globalTenantId: event.globalTenantId,
              branchId: event.branchId,
              orderId: order.id,
              orderItemId: ticket.orderItemId,
              stationId: ticket.stationId,
            })),
          });
          await tx.orderItem.updateMany({
            where: { orderId: order.id, status: "DRAFT" },
            data: { status: "QUEUED", revision: { increment: 1 } },
          });
          await tx.restaurantOrder.update({
            where: { id: order.id },
            data: {
              status: "SUBMITTED",
              submittedAt: new Date(payload.submittedAt),
              revision: event.aggregateVersion,
            },
          });
        } else if (event.eventType === "ORDER_CANCELLED") {
          const payload = z.object({
            reason: z.string().trim().min(2).max(500),
            cancelledAt: z.iso.datetime(),
            restorations: z.array(z.object({
              allocationId: z.string().min(1),
              ingredientId: z.string().min(1),
              warehouseId: z.string().min(1),
              quantity: z.string(),
              restoredAfter: z.string(),
              expectedRevision: z.number().int().positive(),
            }).strict()),
            cancelledTicketIds: z.array(z.string().min(1)),
          }).strict().parse(event.payload);
          const order = await tx.restaurantOrder.findFirst({
            where: {
              id: event.aggregateId,
              globalTenantId: event.globalTenantId,
              branchId: event.branchId,
              status: { in: ["OPEN", "SUBMITTED", "PARTIALLY_READY"] },
              revision: event.aggregateVersion - 1,
            },
          });
          if (!order) throw new Error("REST_ORDER_REVISION_CONFLICT");
          const consumptions = await tx.inventoryMovement.findMany({
            where: {
              globalTenantId: event.globalTenantId,
              referenceType: "ORDER",
              referenceId: order.id,
              kind: "RECIPE_CONSUMPTION",
              reversedBy: null,
            },
          });
          const required = new Map<string, Prisma.Decimal>();
          for (const movement of consumptions) {
            const key = `${movement.warehouseId}:${movement.ingredientId}`;
            required.set(
              key,
              (required.get(key) ?? new Prisma.Decimal(0)).add(movement.quantity.abs()),
            );
          }
          if (
            payload.restorations.length !== required.size ||
            payload.restorations.some((restoration) =>
              !required.get(`${restoration.warehouseId}:${restoration.ingredientId}`)
                ?.equals(restoration.quantity))
          ) throw new Error("EDGE_INVENTORY_RESTORATION_MISMATCH");
          for (const restoration of payload.restorations) {
            const allocation = await tx.branchInventoryAllocation.findFirst({
              where: {
                id: restoration.allocationId,
                globalTenantId: event.globalTenantId,
                branchId: event.branchId,
                warehouseId: restoration.warehouseId,
                ingredientId: restoration.ingredientId,
                revision: restoration.expectedRevision,
              },
            });
            const balance = await tx.inventoryBalance.findUnique({
              where: {
                warehouseId_ingredientId: {
                  warehouseId: restoration.warehouseId,
                  ingredientId: restoration.ingredientId,
                },
              },
            });
            const quantity = new Prisma.Decimal(restoration.quantity);
            if (
              !allocation || !balance ||
              !allocation.available.add(quantity).equals(restoration.restoredAfter)
            ) throw new Error("EDGE_INVENTORY_RESTORATION_CONFLICT");
            await tx.branchInventoryAllocation.update({
              where: { id: allocation.id },
              data: {
                available: restoration.restoredAfter,
                revision: { increment: 1 },
              },
            });
            let nextBalance = balance.onHand;
            for (const movement of consumptions.filter((candidate) =>
              candidate.warehouseId === restoration.warehouseId &&
              candidate.ingredientId === restoration.ingredientId)) {
              const restored = movement.quantity.abs();
              nextBalance = nextBalance.add(restored);
              await tx.inventoryMovement.create({
                data: {
                  globalTenantId: event.globalTenantId,
                  warehouseId: movement.warehouseId,
                  ingredientId: movement.ingredientId,
                  kind: "REVERSAL",
                  quantity: restored,
                  balanceAfter: nextBalance,
                  commandId: `${event.idempotencyKey}:reversal:${movement.id}`,
                  actorId: event.actorId,
                  referenceType: "ORDER",
                  referenceId: order.id,
                  reason: payload.reason,
                  reversalOfId: movement.id,
                },
              });
            }
            await tx.inventoryBalance.update({
              where: { id: balance.id },
              data: { onHand: nextBalance, revision: { increment: 1 } },
            });
          }
          const cancellableTickets = await tx.kitchenTicket.findMany({
            where: {
              orderId: order.id,
              status: { notIn: ["SERVED", "CANCELLED"] },
            },
            select: { id: true },
          });
          if (
            cancellableTickets.length !== payload.cancelledTicketIds.length ||
            cancellableTickets.some((ticket) =>
              !payload.cancelledTicketIds.includes(ticket.id))
          ) throw new Error("EDGE_KITCHEN_CANCELLATION_MISMATCH");
          await tx.kitchenTicket.updateMany({
            where: { id: { in: payload.cancelledTicketIds } },
            data: {
              status: "CANCELLED",
              cancelledAt: new Date(payload.cancelledAt),
              revision: { increment: 1 },
            },
          });
          await tx.orderItem.updateMany({
            where: { orderId: order.id, status: { not: "SERVED" } },
            data: { status: "CANCELLED", revision: { increment: 1 } },
          });
          await tx.restaurantOrder.update({
            where: { id: order.id },
            data: {
              status: "CANCELLED",
              cancelledAt: new Date(payload.cancelledAt),
              cancellationReason: payload.reason,
              revision: event.aggregateVersion,
            },
          });
        } else if (event.eventType === "ORDER_SPLIT") {
          const totalsSchema = z.object({
            subtotal: z.string(), discountTotal: z.string(),
            taxTotal: z.string(), total: z.string(),
          }).strict();
          const payload = z.object({
            itemIds: z.array(z.string().min(1)).min(1),
            newOrderId: z.string().min(1),
            sourceTotals: totalsSchema,
            splitTotals: totalsSchema,
          }).strict().parse(event.payload);
          const order = await tx.restaurantOrder.findFirst({
            where: {
              id: event.aggregateId,
              globalTenantId: event.globalTenantId,
              branchId: event.branchId,
              status: "OPEN",
              revision: event.aggregateVersion - 1,
            },
          });
          if (!order) throw new Error("REST_ORDER_REVISION_CONFLICT");
          const ids = [...new Set(payload.itemIds)];
          if (await tx.orderItem.count({
            where: { id: { in: ids }, orderId: order.id, status: "DRAFT" },
          }) !== ids.length) throw new Error("REST_ORDER_SPLIT_ITEM_INVALID");
          const sequence = await tx.branchOrderSequence.upsert({
            where: { branchId: event.branchId },
            create: {
              globalTenantId: event.globalTenantId,
              branchId: event.branchId,
              nextNumber: 2,
            },
            update: { nextNumber: { increment: 1 } },
          });
          const split = await tx.restaurantOrder.create({
            data: {
              id: payload.newOrderId,
              restTenantId: order.restTenantId,
              globalTenantId: event.globalTenantId,
              branchId: event.branchId,
              tableId: order.tableId,
              orderNumber: sequence.nextNumber - 1,
              guestCount: order.guestCount,
              openedBy: event.actorId,
            },
          });
          await tx.orderItem.updateMany({
            where: { id: { in: ids }, orderId: order.id },
            data: { orderId: split.id },
          });
          const calculate = async (orderId: string) => {
            const items = await tx.orderItem.findMany({
              where: { orderId, status: { not: "CANCELLED" } },
              select: {
                lineTotal: true, netTotal: true, taxAmount: true,
                discountTotal: true,
              },
            });
            return {
              subtotal: items.reduce((sum, item) =>
                sum.add(item.netTotal), new Prisma.Decimal(0)),
              discountTotal: items.reduce((sum, item) =>
                sum.add(item.discountTotal), new Prisma.Decimal(0)),
              taxTotal: items.reduce((sum, item) =>
                sum.add(item.taxAmount), new Prisma.Decimal(0)),
              total: items.reduce((sum, item) =>
                sum.add(item.lineTotal), new Prisma.Decimal(0)),
            };
          };
          const [sourceTotals, splitTotals] = await Promise.all([
            calculate(order.id), calculate(split.id),
          ]);
          const matches = (actual: typeof sourceTotals, claimed: z.infer<typeof totalsSchema>) =>
            actual.subtotal.equals(claimed.subtotal) &&
            actual.discountTotal.equals(claimed.discountTotal) &&
            actual.taxTotal.equals(claimed.taxTotal) &&
            actual.total.equals(claimed.total);
          if (
            !matches(sourceTotals, payload.sourceTotals) ||
            !matches(splitTotals, payload.splitTotals)
          ) throw new Error("EDGE_ORDER_TOTAL_MISMATCH");
          await tx.restaurantOrder.update({
            where: { id: order.id },
            data: { ...sourceTotals, revision: event.aggregateVersion },
          });
          await tx.restaurantOrder.update({
            where: { id: split.id },
            data: { ...splitTotals, revision: 2 },
          });
        } else if (event.eventType === "ORDER_MERGED") {
          const payload = z.object({
            sourceOrderId: z.string().min(1),
            sourceExpectedVersion: z.number().int().positive(),
            totals: z.object({
              subtotal: z.string(), discountTotal: z.string(),
              taxTotal: z.string(), total: z.string(),
            }).strict(),
          }).strict().parse(event.payload);
          const [target, source] = await Promise.all([
            tx.restaurantOrder.findFirst({
              where: {
                id: event.aggregateId,
                globalTenantId: event.globalTenantId,
                branchId: event.branchId,
                status: "OPEN",
                revision: event.aggregateVersion - 1,
              },
            }),
            tx.restaurantOrder.findFirst({
              where: {
                id: payload.sourceOrderId,
                globalTenantId: event.globalTenantId,
                branchId: event.branchId,
                status: "OPEN",
                revision: payload.sourceExpectedVersion,
              },
            }),
          ]);
          if (!target || !source || target.id === source.id) {
            throw new Error("REST_ORDER_MERGE_CONFLICT");
          }
          await tx.orderItem.updateMany({
            where: { orderId: source.id, status: "DRAFT" },
            data: { orderId: target.id },
          });
          const items = await tx.orderItem.findMany({
            where: { orderId: target.id, status: { not: "CANCELLED" } },
            select: {
              lineTotal: true, netTotal: true, taxAmount: true,
              discountTotal: true,
            },
          });
          const totals = {
            subtotal: items.reduce((sum, item) =>
              sum.add(item.netTotal), new Prisma.Decimal(0)),
            discountTotal: items.reduce((sum, item) =>
              sum.add(item.discountTotal), new Prisma.Decimal(0)),
            taxTotal: items.reduce((sum, item) =>
              sum.add(item.taxAmount), new Prisma.Decimal(0)),
            total: items.reduce((sum, item) =>
              sum.add(item.lineTotal), new Prisma.Decimal(0)),
          };
          if (
            !totals.subtotal.equals(payload.totals.subtotal) ||
            !totals.discountTotal.equals(payload.totals.discountTotal) ||
            !totals.taxTotal.equals(payload.totals.taxTotal) ||
            !totals.total.equals(payload.totals.total)
          ) throw new Error("EDGE_ORDER_TOTAL_MISMATCH");
          await tx.restaurantOrder.update({
            where: { id: target.id },
            data: { ...totals, revision: event.aggregateVersion },
          });
          await tx.restaurantOrder.update({
            where: { id: source.id },
            data: { status: "MERGED", revision: source.revision + 1 },
          });
        } else {
          throw new Error("EDGE_ORDER_EVENT_UNSUPPORTED");
        }
      }
      if (event.aggregateType === "TABLE") {
        const payload = z.object({
          fromStatus: z.string().min(1),
          toStatus: z.enum([
            "AVAILABLE", "RESERVED", "OCCUPIED", "DIRTY", "CLEANING", "DISABLED",
          ]),
        }).strict().parse(event.payload);
        const table = await tx.diningTable.findFirst({
          where: {
            id: event.aggregateId,
            globalTenantId: event.globalTenantId,
            branchId: event.branchId,
            status: payload.fromStatus,
            revision: event.aggregateVersion - 1,
          },
        });
        if (!table) throw new Error("REST_TABLE_REVISION_CONFLICT");
        const allowed: Record<string, string[]> = {
          AVAILABLE: ["RESERVED", "OCCUPIED", "DISABLED"],
          RESERVED: ["OCCUPIED", "AVAILABLE"],
          OCCUPIED: ["DIRTY"],
          DIRTY: ["CLEANING"],
          CLEANING: ["AVAILABLE"],
          DISABLED: ["AVAILABLE"],
        };
        if (!allowed[payload.fromStatus]?.includes(payload.toStatus)) {
          throw new Error("REST_TABLE_TRANSITION_INVALID");
        }
        await tx.diningTable.update({
          where: { id: table.id },
          data: { status: payload.toStatus, revision: event.aggregateVersion },
        });
        await tx.tableTransition.create({
          data: {
            globalTenantId: event.globalTenantId,
            branchId: event.branchId,
            tableId: table.id,
            fromStatus: payload.fromStatus,
            toStatus: payload.toStatus,
            fromRevision: event.aggregateVersion - 1,
            toRevision: event.aggregateVersion,
            actorId: event.actorId,
            commandId: event.idempotencyKey,
          },
        });
      }
      if (event.aggregateType === "RESERVATION") {
        if (event.eventType === "RESERVATION_CANCELLED") {
          const payload = z.object({
            reason: z.string().min(2).max(500).optional(),
            cancelledAt: z.iso.datetime(),
          }).strict().parse(event.payload);
          const changed = await tx.reservation.updateMany({
            where: {
              id: event.aggregateId,
              globalTenantId: event.globalTenantId,
              branchId: event.branchId,
              status: { in: ["CONFIRMED", "SEATED"] },
              revision: event.aggregateVersion - 1,
            },
            data: {
              status: "CANCELLED",
              cancellationReason: payload.reason,
              cancelledAt: new Date(payload.cancelledAt),
              revision: event.aggregateVersion,
            },
          });
          if (changed.count !== 1) throw new Error("REST_RESERVATION_REVISION_CONFLICT");
        } else if (event.eventType !== "RESERVATION_CREATED") {
          throw new Error("EDGE_RESERVATION_EVENT_UNSUPPORTED");
        } else {
        const payload = z.object({
          guestName: z.string().trim().min(2).max(120),
          guestPhone: z.string().trim().min(6).max(30).optional(),
          partySize: z.number().int().positive().max(200),
          startsAt: z.iso.datetime(),
          endsAt: z.iso.datetime(),
          tableIds: z.array(z.string().min(1)).min(1),
          notes: z.string().max(1000).optional(),
        }).strict().parse(event.payload);
        const startsAt = new Date(payload.startsAt);
        const endsAt = new Date(payload.endsAt);
        if (endsAt <= startsAt) throw new Error("REST_RESERVATION_TIME_INVALID");
        const tableIds = [...new Set(payload.tableIds)];
        const tables = await tx.diningTable.findMany({
          where: {
            id: { in: tableIds },
            globalTenantId: event.globalTenantId,
            branchId: event.branchId,
          },
        });
        if (tables.length !== tableIds.length) {
          throw new Error("REST_RESERVATION_TABLE_NOT_FOUND");
        }
        if (tables.reduce((sum, table) => sum + table.capacity, 0) < payload.partySize) {
          throw new Error("REST_RESERVATION_CAPACITY_INSUFFICIENT");
        }
        if (await tx.reservationTable.count({
          where: {
            tableId: { in: tableIds },
            reservation: {
              globalTenantId: event.globalTenantId,
              branchId: event.branchId,
              status: { in: ["CONFIRMED", "SEATED"] },
              startsAt: { lt: endsAt },
              endsAt: { gt: startsAt },
            },
          },
        })) throw new Error("REST_RESERVATION_OVERLAP");
        await tx.reservation.create({
          data: {
            id: event.aggregateId,
            restTenantId: tenant.id,
            globalTenantId: event.globalTenantId,
            branchId: event.branchId,
            guestName: payload.guestName,
            guestPhone: payload.guestPhone,
            partySize: payload.partySize,
            startsAt,
            endsAt,
            notes: payload.notes,
            revision: event.aggregateVersion,
            createdBy: event.actorId,
            tables: {
              create: tableIds.map((tableId) => ({
                globalTenantId: event.globalTenantId,
                tableId,
              })),
            },
          },
        });
        }
      }
      if (event.aggregateType === "CASH_DRAWER") {
        if (event.eventType === "CASH_DRAWER_OPENED") {
          const payload = z.object({
            stationId: z.string().trim().min(1).max(100),
            openingFloat: z.string(),
            openedAt: z.iso.datetime(),
          }).strict().parse(event.payload);
          if (await tx.cashDrawer.findFirst({
            where: {
              globalTenantId: event.globalTenantId,
              branchId: event.branchId,
              stationId: payload.stationId,
              status: "OPEN",
            },
          })) throw new Error("REST_CASH_DRAWER_ALREADY_OPEN");
          await tx.cashDrawer.create({
            data: {
              id: event.aggregateId,
              restTenantId: tenant.id,
              globalTenantId: event.globalTenantId,
              branchId: event.branchId,
              stationId: payload.stationId,
              openingFloat: payload.openingFloat,
              expectedCash: payload.openingFloat,
              openedBy: event.actorId,
              openedAt: new Date(payload.openedAt),
              revision: event.aggregateVersion,
            },
          });
        } else if (event.eventType === "CASH_DRAWER_CLOSED") {
          const payload = z.object({
            countedCash: z.string(),
            expectedCash: z.string(),
            variance: z.string(),
            closedAt: z.iso.datetime(),
          }).strict().parse(event.payload);
          const drawer = await tx.cashDrawer.findFirst({
            where: {
              id: event.aggregateId,
              globalTenantId: event.globalTenantId,
              branchId: event.branchId,
              status: "OPEN",
              revision: event.aggregateVersion - 1,
            },
          });
          if (
            !drawer ||
            !drawer.expectedCash.equals(payload.expectedCash) ||
            !new Prisma.Decimal(payload.countedCash)
              .sub(drawer.expectedCash).equals(payload.variance)
          ) throw new Error("REST_CASH_DRAWER_RECONCILIATION_CONFLICT");
          await tx.cashDrawer.update({
            where: { id: drawer.id },
            data: {
              status: "CLOSED",
              countedCash: payload.countedCash,
              variance: payload.variance,
              closedBy: event.actorId,
              closedAt: new Date(payload.closedAt),
              revision: event.aggregateVersion,
            },
          });
        } else {
          throw new Error("EDGE_CASH_DRAWER_EVENT_UNSUPPORTED");
        }
      }
      if (event.aggregateType === "PAYMENT") {
        if (event.eventType !== "CASH_PAYMENT_APPLIED") {
          throw new Error("EDGE_PAYMENT_EVENT_UNSUPPORTED");
        }
        const payload = z.object({
          id: z.string().min(1),
          orderId: z.string().min(1),
          drawerId: z.string().min(1),
          tenderType: z.literal("CASH"),
          amount: z.string(),
          currency: z.literal("ARS"),
          status: z.literal("APPLIED"),
          drawerExpectedCash: z.string(),
          orderPaidTotal: z.string(),
          orderStatus: z.string(),
          occurredAt: z.iso.datetime(),
          orderExpectedRevision: z.number().int().positive(),
          drawerExpectedRevision: z.number().int().positive(),
        }).passthrough().parse(event.payload);
        if (payload.id !== event.aggregateId) {
          throw new Error("EDGE_PAYMENT_ID_MISMATCH");
        }
        const order = await tx.restaurantOrder.findFirst({
          where: {
            id: payload.orderId,
            globalTenantId: event.globalTenantId,
            branchId: event.branchId,
            status: { notIn: ["CANCELLED", "PAID", "REFUNDED"] },
            revision: payload.orderExpectedRevision,
          },
          include: {
            payments: {
              where: {
                status: { in: ["APPLIED", "PARTIALLY_REFUNDED", "REFUNDED"] },
              },
              select: { amount: true },
            },
          },
        });
        const drawer = await tx.cashDrawer.findFirst({
          where: {
            id: payload.drawerId,
            globalTenantId: event.globalTenantId,
            branchId: event.branchId,
            status: "OPEN",
            revision: payload.drawerExpectedRevision,
          },
        });
        if (!order || !drawer) throw new Error("EDGE_PAYMENT_STATE_CONFLICT");
        const paid = order.payments.reduce(
          (sum, payment) => sum.add(payment.amount),
          new Prisma.Decimal(0),
        );
        const amount = new Prisma.Decimal(payload.amount);
        if (
          amount.lessThanOrEqualTo(0) ||
          amount.greaterThan(order.total.sub(paid)) ||
          !paid.add(amount).equals(payload.orderPaidTotal) ||
          !drawer.expectedCash.add(amount).equals(payload.drawerExpectedCash)
        ) throw new Error("EDGE_PAYMENT_AMOUNT_CONFLICT");
        await tx.payment.create({
          data: {
            id: event.aggregateId,
            restTenantId: tenant.id,
            globalTenantId: event.globalTenantId,
            branchId: event.branchId,
            orderId: order.id,
            drawerId: drawer.id,
            tenderType: "CASH",
            amount,
            actorId: event.actorId,
            commandId: event.idempotencyKey,
            createdAt: new Date(payload.occurredAt),
          },
        });
        await tx.cashMovement.create({
          data: {
            restTenantId: tenant.id,
            globalTenantId: event.globalTenantId,
            branchId: event.branchId,
            drawerId: drawer.id,
            paymentId: event.aggregateId,
            type: "SALE",
            amount,
            balanceAfter: payload.drawerExpectedCash,
            reason: `Cobro orden #${order.orderNumber}`,
            actorId: event.actorId,
            commandId: `${event.idempotencyKey}:cash`,
            occurredAt: new Date(payload.occurredAt),
          },
        });
        const nextOrderStatus = paid.add(amount).equals(order.total)
          ? "PAID" : order.status;
        if (nextOrderStatus !== payload.orderStatus) {
          throw new Error("EDGE_PAYMENT_ORDER_STATUS_MISMATCH");
        }
        const nextOrderRevision = order.revision + 1;
        const nextDrawerRevision = drawer.revision + 1;
        await tx.restaurantOrder.update({
          where: { id: order.id },
          data: {
            status: nextOrderStatus,
            revision: nextOrderRevision,
          },
        });
        await tx.cashDrawer.update({
          where: { id: drawer.id },
          data: {
            expectedCash: payload.drawerExpectedCash,
            revision: nextDrawerRevision,
          },
        });
        await tx.edgeAggregateProjection.upsert({
          where: {
            globalTenantId_aggregateType_aggregateId: {
              globalTenantId: event.globalTenantId,
              aggregateType: "ORDER",
              aggregateId: order.id,
            },
          },
          create: {
            restTenantId: tenant.id,
            globalTenantId: event.globalTenantId,
            aggregateType: "ORDER",
            aggregateId: order.id,
            version: nextOrderRevision,
            state: {
              status: nextOrderStatus,
              paidTotal: payload.orderPaidTotal,
            },
          },
          update: {
            version: nextOrderRevision,
            state: {
              status: nextOrderStatus,
              paidTotal: payload.orderPaidTotal,
            },
          },
        });
        await tx.edgeAggregateProjection.upsert({
          where: {
            globalTenantId_aggregateType_aggregateId: {
              globalTenantId: event.globalTenantId,
              aggregateType: "CASH_DRAWER",
              aggregateId: drawer.id,
            },
          },
          create: {
            restTenantId: tenant.id,
            globalTenantId: event.globalTenantId,
            aggregateType: "CASH_DRAWER",
            aggregateId: drawer.id,
            version: nextDrawerRevision,
            state: { expectedCash: payload.drawerExpectedCash },
          },
          update: {
            version: nextDrawerRevision,
            state: { expectedCash: payload.drawerExpectedCash },
          },
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
