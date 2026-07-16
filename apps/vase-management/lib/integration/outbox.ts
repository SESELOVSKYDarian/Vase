import { randomUUID } from "node:crypto";
import type { ManagementSyncEvent } from "@vase/contracts";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mapManagementProductEvent, nextManagementRetryDelayMs } from "./sync-core";

export async function enqueueManagementProduct(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { company: { select: { globalTenantId: true, integrationProvider: true } } } });
  if (!product?.company.globalTenantId || product.company.integrationProvider !== "VASE_MANAGEMENT") return null;
  const event = mapManagementProductEvent({ id: product.id, companyGlobalId: product.company.globalTenantId, code: product.code, name: product.name, description: product.description, price: Number(product.price), stock: Number(product.stock), active: product.isActive, version: product.sourceVersion, occurredAt: product.updatedAt.toISOString() }, randomUUID());
  await prisma.$transaction(["BUSINESS", "LABS"].map((destination) => prisma.managementSyncOutbox.create({ data: { eventId: `${event.eventId}:${destination.toLowerCase()}`, companyId: product.companyId, globalTenantId: event.globalTenantId, destination, entity: event.entity, action: event.action, externalId: event.externalId, version: event.version, payload: event as Prisma.InputJsonValue } })));
  return event;
}

async function deliver(destination: string, event: ManagementSyncEvent) {
  const token = process.env.SERVICE_TO_SERVICE_TOKEN ?? "";
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  if (destination === "LABS") {
    const product = event.payload;
    const response = await fetch(new URL("/api/internal/business/catalog/sync", process.env.LABS_INTERNAL_URL ?? "http://localhost:3007"), { method: "POST", headers, body: JSON.stringify({ eventId: event.eventId, globalTenantId: event.globalTenantId, occurredAt: event.occurredAt, products: [{ externalProductId: event.externalId, sku: product.sku ?? null, name: product.name, description: product.description ?? null, price: product.price ?? null, stock: Math.trunc(Number(product.stock ?? 0)), imageUrl: null, categories: [], active: event.action === "UPSERT", sourceUpdatedAt: event.occurredAt }] }) });
    if (!response.ok) throw new Error(`LABS_SYNC_${response.status}`);
    return;
  }
  const response = await fetch(new URL("/api/v1/integrations/management/events", process.env.BUSINESS_INTERNAL_URL ?? "http://localhost:3005"), { method: "POST", headers, body: JSON.stringify(event) });
  if (!response.ok) throw new Error(`BUSINESS_SYNC_${response.status}`);
}

export async function processManagementOutbox(limit = 25) {
  const rows = await prisma.managementSyncOutbox.findMany({ where: { status: { in: ["PENDING", "FAILED"] }, nextAttemptAt: { lte: new Date() } }, orderBy: { createdAt: "asc" }, take: limit });
  for (const row of rows) {
    try {
      await deliver(row.destination, row.payload as unknown as ManagementSyncEvent);
      await prisma.managementSyncOutbox.update({ where: { id: row.id }, data: { status: "COMPLETED", completedAt: new Date(), lastError: null } });
    } catch (error) {
      const attempts = row.attempts + 1;
      await prisma.managementSyncOutbox.update({ where: { id: row.id }, data: { status: "FAILED", attempts, nextAttemptAt: new Date(Date.now() + nextManagementRetryDelayMs(attempts)), lastError: String(error instanceof Error ? error.message : error).slice(0, 500) } });
    }
  }
  return rows.length;
}
