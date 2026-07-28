import { sign } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { restSyncEventSchema } from "@vase/contracts";
import { db } from "@/lib/db";
import { authenticateEdgeRequest } from "@/lib/edge/edge-auth";
import {
  createCloudSyncService,
  prismaCloudSyncRepository,
} from "@/lib/edge/sync-service";

const service = createCloudSyncService(prismaCloudSyncRepository);
const batchSchema = z.object({
  events: z.array(restSyncEventSchema).min(1).max(100),
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
    const snapshots = conflicts.length ? await db.edgeAggregateProjection.findMany({
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
