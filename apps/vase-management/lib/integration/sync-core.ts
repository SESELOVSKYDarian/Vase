import { managementSyncEventSchema, type ManagementSyncEvent } from "@vase/contracts";

type ProductSource = { id: string; companyGlobalId: string; code: string | null; name: string; description: string | null; price: number; stock: number; active: boolean; version: number; occurredAt: string };

export function mapManagementProductEvent(product: ProductSource, eventId: string): ManagementSyncEvent {
  return managementSyncEventSchema.parse({
    eventId,
    globalTenantId: product.companyGlobalId,
    entity: "PRODUCT",
    action: product.active ? "UPSERT" : "ARCHIVE",
    externalId: product.id,
    version: product.version,
    occurredAt: product.occurredAt,
    payload: { sku: product.code, name: product.name, description: product.description, price: product.price, stock: product.stock, active: product.active },
  });
}

export function shouldApplySyncVersion(currentVersion: number | null | undefined, incomingVersion: number) {
  return currentVersion == null || incomingVersion > currentVersion;
}

export function nextManagementRetryDelayMs(attempt: number) {
  return Math.min(15 * 60_000, Math.max(5_000, 5_000 * 2 ** Math.max(0, attempt - 1)));
}
