import { sign } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { restSyncEventSchema } from "@vase/contracts";
import { db } from "@/lib/db";
import { authenticateEdgeRequest } from "@/lib/edge/edge-auth";
import {
  createCloudSyncService,
  prismaCloudSyncRepository,
} from "@/lib/edge/sync-service";
import { effectiveRecipeItems } from "@/lib/catalog/effective-recipe";

const service = createCloudSyncService(prismaCloudSyncRepository);
const batchSchema = z.object({
  events: z.array(restSyncEventSchema).max(100),
  heartbeat: z.object({
    agentVersion: z.string().min(1).max(80),
    pendingEventCount: z.number().int().nonnegative(),
    failedPrintJobCount: z.number().int().nonnegative(),
    lastCloudSyncAt: z.iso.datetime().nullable(),
    lastErrorCode: z.string().max(120).nullable(),
  }).strict(),
}).strict();

export async function POST(request: Request) {
  try {
    const edge = await authenticateEdgeRequest(request);
    const batch = batchSchema.parse(await request.json());
    await db.edgeInstallation.update({
      where: { id: edge.id },
      data: {
        lastSeenAt: new Date(),
        lastCloudSyncAt: batch.heartbeat.lastCloudSyncAt
          ? new Date(batch.heartbeat.lastCloudSyncAt) : null,
        agentVersion: batch.heartbeat.agentVersion,
        pendingEventCount: batch.heartbeat.pendingEventCount,
        failedPrintJobCount: batch.heartbeat.failedPrintJobCount,
        lastErrorCode: batch.heartbeat.lastErrorCode,
      },
    });
    const receipts = [];
    for (const event of batch.events) {
      if (
        event.globalTenantId !== edge.globalTenantId ||
        event.branchId !== edge.branchId ||
        event.installationId !== edge.id
      ) {
        receipts.push({
          eventId: event.eventId,
          status: "REJECTED",
          aggregateVersion: 0,
          code: "EDGE_EVENT_SCOPE_FORBIDDEN",
        });
        continue;
      }
      receipts.push(await service.accept(event));
    }
    const conflicts = receipts.filter((receipt) => receipt.status === "CONFLICT");
    const conflictSnapshots = conflicts.length ? await db.edgeAggregateProjection.findMany({
      where: {
        globalTenantId: edge.globalTenantId,
        OR: batch.events.filter((event) =>
          conflicts.some((receipt) => receipt.eventId === event.eventId))
          .map((event) => ({
            aggregateType: event.aggregateType,
            aggregateId: event.aggregateId,
          })),
      },
      select: {
        aggregateType: true, aggregateId: true, version: true, state: true,
      },
    }) : [];
    const [
      tables,
      orders,
      kitchenTickets,
      groupMembers,
      categories,
      stationMappings,
      inventoryAllocations,
      reservations,
      cashDrawers,
      payments,
      inventoryBalances,
      inventoryMovements,
    ] = await Promise.all([
      db.diningTable.findMany({
        where: { globalTenantId: edge.globalTenantId, branchId: edge.branchId },
      }),
      db.restaurantOrder.findMany({
        where: {
          globalTenantId: edge.globalTenantId,
          branchId: edge.branchId,
          status: { in: ["OPEN", "SUBMITTED", "PARTIALLY_READY", "READY"] },
        },
        include: {
          items: { include: { modifiers: true } },
          payments: {
            where: {
              status: { in: ["APPLIED", "PARTIALLY_REFUNDED", "REFUNDED"] },
            },
            select: { amount: true },
          },
        },
      }),
      db.kitchenTicket.findMany({
        where: {
          globalTenantId: edge.globalTenantId,
          branchId: edge.branchId,
          status: { in: ["QUEUED", "PREPARING", "READY"] },
        },
        include: {
          station: true,
          order: { select: { orderNumber: true, table: { select: { code: true } } } },
          orderItem: { include: { modifiers: true } },
        },
      }),
      db.branchGroupMember.findMany({
        where: {
          globalTenantId: edge.globalTenantId,
          branchId: edge.branchId,
        },
        select: { branchGroupId: true },
      }),
      db.menuCategory.findMany({
        where: { globalTenantId: edge.globalTenantId, active: true },
        orderBy: { sortOrder: "asc" },
        include: {
          products: {
            where: { available: true },
            orderBy: { name: "asc" },
            include: {
              prices: true,
              recipeItems: true,
              branchAvailability: {
                where: { branchId: edge.branchId },
              },
              modifierGroups: {
                orderBy: { sortOrder: "asc" },
                include: {
                  modifierGroup: {
                    include: { options: { where: { active: true } } },
                  },
                },
              },
            },
          },
        },
      }),
      db.kitchenStationCategory.findMany({
        where: {
          globalTenantId: edge.globalTenantId,
          station: { branchId: edge.branchId, active: true },
        },
        select: { categoryId: true, stationId: true },
      }),
      db.branchInventoryAllocation.findMany({
        where: {
          globalTenantId: edge.globalTenantId,
          branchId: edge.branchId,
        },
        include: { branch: true, ingredient: true, warehouse: true },
      }),
      db.reservation.findMany({
        where: {
          globalTenantId: edge.globalTenantId,
          branchId: edge.branchId,
          endsAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) },
          status: { in: ["CONFIRMED", "SEATED"] },
        },
        include: { tables: { include: { table: true } } },
      }),
      db.cashDrawer.findMany({
        where: {
          globalTenantId: edge.globalTenantId,
          branchId: edge.branchId,
          openedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60_000) },
        },
      }),
      db.payment.findMany({
        where: {
          globalTenantId: edge.globalTenantId,
          branchId: edge.branchId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60_000) },
        },
      }),
      db.inventoryBalance.findMany({
        where: { globalTenantId: edge.globalTenantId },
        include: { ingredient: true, warehouse: true },
      }),
      db.inventoryMovement.findMany({
        where: {
          globalTenantId: edge.globalTenantId,
          occurredAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60_000) },
        },
        orderBy: { occurredAt: "desc" },
        take: 500,
      }),
    ]);
    const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(
      value,
      (_key, item) =>
      typeof item === "object" && item && typeof item.toFixed === "function"
        ? item.toFixed() : item,
    )) as Prisma.InputJsonValue;
    const groupIds = groupMembers.map((member) => member.branchGroupId);
    const catalogProducts = categories.flatMap((category) =>
      category.products.flatMap((product) => {
        if (product.branchAvailability[0]?.available === false) return [];
        const branchPrice = product.prices.find((price) =>
          price.scopeType === "BRANCH" && price.scopeId === edge.branchId);
        const groupPrice = product.prices.filter((price) =>
          price.scopeType === "BRANCH_GROUP" && groupIds.includes(price.scopeId))
          .sort((left, right) => right.revision - left.revision)[0];
        const tenantPrice = product.prices.find((price) =>
          price.scopeType === "TENANT" && price.scopeId === edge.globalTenantId);
        const price = branchPrice ?? groupPrice ?? tenantPrice;
        if (!price) return [];
        return [{
          id: product.id,
          categoryId: category.id,
          sku: product.sku,
          name: product.name,
          available: true,
          unitPrice: price.amount.toFixed(2),
          taxRate: product.taxRate.toFixed(2),
          taxIncluded: product.taxIncluded,
          stationId: stationMappings.find((mapping) =>
            mapping.categoryId === category.id)?.stationId,
          recipeItems: effectiveRecipeItems({
            globalTenantId: edge.globalTenantId,
            branchId: edge.branchId,
            branchGroupIds: groupIds,
            items: product.recipeItems.map((recipe) => ({
              scopeType: recipe.scopeType,
              scopeId: recipe.scopeId,
              scopeRevision: recipe.scopeRevision,
              value: recipe,
            })),
          }).map((recipe) => ({
            ingredientId: recipe.ingredientId,
            quantity: recipe.quantity.toFixed(6),
          })),
          modifierOptions: product.modifierGroups.flatMap((link) =>
            link.modifierGroup.options.map((option) => ({
              id: option.id,
              name: option.name,
              priceDelta: option.priceDelta.toFixed(2),
              active: option.active,
            }))),
        }];
      }));
    const snapshots = [
      ...conflictSnapshots.map((snapshot) => ({
        ...snapshot,
        state: json(snapshot.state),
      })),
      ...tables.map((table) => ({
        aggregateType: "TABLE", aggregateId: table.id,
        version: table.revision, state: json(table),
      })),
      ...orders.map((order) => ({
        aggregateType: "ORDER", aggregateId: order.id,
        version: order.revision,
        state: json({
          ...order,
          paidTotal: order.payments.reduce(
            (sum, payment) => sum.add(payment.amount),
            new Prisma.Decimal(0),
          ).toFixed(2),
        }),
      })),
      ...kitchenTickets.map((ticket) => ({
        aggregateType: "KITCHEN_TICKET", aggregateId: ticket.id,
        version: ticket.revision, state: json(ticket),
      })),
      {
        aggregateType: "CATALOG",
        aggregateId: "current",
        version: Date.now(),
        state: json({
          categories: categories.map((category) => ({
            id: category.id,
            name: category.name,
          })),
          products: catalogProducts,
        }),
      },
      ...inventoryAllocations.map((allocation) => ({
        aggregateType: "INVENTORY_ALLOCATION",
        aggregateId: allocation.id,
        version: allocation.revision,
        state: json({
          id: allocation.id,
          ingredientId: allocation.ingredientId,
          warehouseId: allocation.warehouseId,
          available: allocation.available.toFixed(6),
          safetyStock: allocation.safetyStock.toFixed(6),
          revision: allocation.revision,
          branch: allocation.branch,
          ingredient: allocation.ingredient,
          warehouse: allocation.warehouse,
        }),
      })),
      ...reservations.map((reservation) => ({
        aggregateType: "RESERVATION",
        aggregateId: reservation.id,
        version: reservation.revision,
        state: json({
          ...reservation,
          tableIds: reservation.tables.map((link) => link.tableId),
        }),
      })),
      ...cashDrawers.map((drawer) => ({
        aggregateType: "CASH_DRAWER",
        aggregateId: drawer.id,
        version: drawer.revision,
        state: json(drawer),
      })),
      ...payments.map((payment) => ({
        aggregateType: "PAYMENT",
        aggregateId: payment.id,
        version: 1,
        state: json(payment),
      })),
      ...inventoryBalances.map((balance) => ({
        aggregateType: "INVENTORY_BALANCE",
        aggregateId: balance.id,
        version: balance.revision,
        state: json(balance),
      })),
      ...inventoryMovements.map((movement) => ({
        aggregateType: "INVENTORY_MOVEMENT",
        aggregateId: movement.id,
        version: 1,
        state: json(movement),
      })),
    ];
    const restTenant = await db.restTenant.findUniqueOrThrow({
      where: { globalTenantId: edge.globalTenantId },
      select: { id: true },
    });
    await db.$transaction(snapshots
      .filter((snapshot) => ["TABLE", "ORDER", "KITCHEN_TICKET"].includes(snapshot.aggregateType))
      .map((snapshot) => db.edgeAggregateProjection.upsert({
        where: {
          globalTenantId_aggregateType_aggregateId: {
            globalTenantId: edge.globalTenantId,
            aggregateType: snapshot.aggregateType,
            aggregateId: snapshot.aggregateId,
          },
        },
        create: {
          restTenantId: restTenant.id,
          globalTenantId: edge.globalTenantId,
          aggregateType: snapshot.aggregateType,
          aggregateId: snapshot.aggregateId,
          version: snapshot.version,
          state: snapshot.state,
        },
        update: {
          version: snapshot.version,
          state: snapshot.state,
        },
      })));
    const policies = await db.configurationPolicy.findMany({
      where: { globalTenantId: edge.globalTenantId },
      orderBy: { updatedAt: "asc" },
      select: {
        family: true, scopeType: true, scopeId: true,
        revision: true, value: true, updatedAt: true,
      },
    });
    const configPayload = {
      revision: Math.max(1, ...policies.map((policy) => policy.updatedAt.getTime())),
      generatedAt: new Date().toISOString(),
      policies: policies.map(({ updatedAt: _updatedAt, ...policy }) => policy),
    };
    const encodedKey = process.env.REST_EDGE_SIGNING_PRIVATE_KEY_B64;
    if (!encodedKey) throw new Error("REST_EDGE_SIGNING_KEY_NOT_CONFIGURED");
    const configDelta = {
      payload: configPayload,
      signature: sign(
        null,
        Buffer.from(JSON.stringify(configPayload)),
        Buffer.from(encodedKey, "base64").toString("utf8"),
      ).toString("base64url"),
      algorithm: "Ed25519",
    };
    return NextResponse.json({ receipts, snapshots, configDelta });
  } catch (error) {
    const code = error instanceof Error ? error.message : "REST_EDGE_SYNC_FAILED";
    return NextResponse.json({ error: code }, {
      status: code.includes("MTLS") ? 401
        : code.includes("REVOKED") || code.includes("FORBIDDEN") ? 403 : 400,
    });
  }
}
