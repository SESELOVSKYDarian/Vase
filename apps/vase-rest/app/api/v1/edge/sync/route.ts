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

const service = createCloudSyncService(prismaCloudSyncRepository);
const batchSchema = z.object({
  events: z.array(restSyncEventSchema).max(100),
}).strict();

export async function POST(request: Request) {
  try {
    const edge = await authenticateEdgeRequest(request);
    const batch = batchSchema.parse(await request.json());
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
    const [tables, orders, kitchenTickets] = await Promise.all([
      db.diningTable.findMany({
        where: { globalTenantId: edge.globalTenantId, branchId: edge.branchId },
      }),
      db.restaurantOrder.findMany({
        where: {
          globalTenantId: edge.globalTenantId,
          branchId: edge.branchId,
          status: { in: ["OPEN", "SUBMITTED", "PARTIALLY_READY", "READY"] },
        },
        include: { items: { include: { modifiers: true } } },
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
    ]);
    const json = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(
      value,
      (_key, item) =>
      typeof item === "object" && item && typeof item.toFixed === "function"
        ? item.toFixed() : item,
    )) as Prisma.InputJsonValue;
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
        version: order.revision, state: json(order),
      })),
      ...kitchenTickets.map((ticket) => ({
        aggregateType: "KITCHEN_TICKET", aggregateId: ticket.id,
        version: ticket.revision, state: json(ticket),
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
