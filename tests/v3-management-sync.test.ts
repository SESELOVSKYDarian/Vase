import { describe, expect, it } from "vitest";
import { mapManagementProductEvent, nextManagementRetryDelayMs, shouldApplySyncVersion } from "../apps/vase-management/lib/integration/sync-core";

describe("Management bidirectional sync", () => {
  it("maps Management products to the shared event contract", () => {
    const event = mapManagementProductEvent({ id: "p1", companyGlobalId: "tenant1", code: "SKU-1", name: "Mate", description: null, price: 1200, stock: 8, active: true, version: 3, occurredAt: "2026-07-16T12:00:00.000Z" }, "evt1");
    expect(event).toMatchObject({ eventId: "evt1", globalTenantId: "tenant1", entity: "PRODUCT", externalId: "p1", version: 3, payload: { sku: "SKU-1", price: 1200, stock: 8 } });
  });

  it("ignores duplicate and older versions and caps retry backoff", () => {
    expect(shouldApplySyncVersion(4, 4)).toBe(false);
    expect(shouldApplySyncVersion(4, 5)).toBe(true);
    expect(nextManagementRetryDelayMs(99)).toBeLessThanOrEqual(15 * 60_000);
  });
});
