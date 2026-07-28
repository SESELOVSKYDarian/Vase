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
            lineTotal: z.string(),
            netTotal: z.string(),
            taxAmount: z.string(),
            taxRate: z.string(),
            taxIncluded: z.boolean(),
            course: z.number().int().positive(),
            notes: z.string().optional(),
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
          });
          if (
            !product ||
            product.sku !== payload.skuSnapshot ||
            product.name !== payload.nameSnapshot ||
            product.categoryId !== payload.categoryId
          ) throw new Error("EDGE_ORDER_PRODUCT_SNAPSHOT_INVALID");
          const optionIds = payload.modifiers.map((item) => item.optionId);
          if (await tx.modifierOption.count({
            where: {
              id: { in: optionIds },
              globalTenantId: event.globalTenantId,
              active: true,
            },
          }) !== new Set(optionIds).size) {
            throw new Error("REST_MODIFIER_NOT_FOUND");
          }
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
          for (const item of order.items) {
            for (const recipe of item.product.recipeItems) {
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
        } else {
          throw new Error("EDGE_ORDER_EVENT_UNSUPPORTED");
        }
      }
      if (event.aggregateType === "RESERVATION") {
        if (event.eventType !== "RESERVATION_CREATED") {
          throw new Error("EDGE_RESERVATION_EVENT_UNSUPPORTED");
        }
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
