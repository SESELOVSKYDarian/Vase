import { describe, expect, it, vi } from "vitest";
import {
  buildBusinessCatalogSnapshot,
  createBusinessCatalogSnapshotHandler,
  resolveBusinessCatalogTenant,
} from "../apps/vase-editor/server/src/services/businessCatalogSnapshot.js";

describe("Business internal catalog snapshot", () => {
  it("resolves the global Vase tenant to the local Business UUID", async () => {
    const query = vi.fn(async () => ({
      rows: [{ id: "business-uuid", external_tenant_id: "global-tenant" }],
    }));

    await expect(resolveBusinessCatalogTenant({ query }, "global-tenant")).resolves.toEqual({
      businessTenantId: "business-uuid",
      globalTenantId: "global-tenant",
    });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("id::text = $1"), ["global-tenant"]);
    expect(query.mock.calls[0]?.[0]).toContain("external_source = 'vase'");
    expect(query.mock.calls[0]?.[0]).toContain("external_tenant_id = $1");
  });

  it("reads products with the local UUID and emits the global tenant ID", async () => {
    const query = vi.fn(async (sql: string, values: unknown[]) => {
      if (sql.includes("from tenants")) {
        return { rows: [{ id: "business-uuid", external_tenant_id: "global-tenant" }] };
      }
      if (sql.includes("from product_cache")) {
        expect(values).toEqual(["business-uuid"]);
        return { rows: [{ id: "p1", external_id: "erp-1", name: "Producto", stock: 2, price: "99.5", updated_at: "2026-07-22T12:00:00.000Z" }] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await expect(buildBusinessCatalogSnapshot({
      db: { query },
      tenantReference: "global-tenant",
      createEventId: () => "event-1",
      now: () => new Date("2026-07-22T13:00:00.000Z"),
    })).resolves.toEqual({
      tenant: { businessTenantId: "business-uuid", globalTenantId: "global-tenant" },
      payload: {
        eventId: "event-1",
        globalTenantId: "global-tenant",
        occurredAt: "2026-07-22T13:00:00.000Z",
        products: [expect.objectContaining({ externalProductId: "erp-1", name: "Producto", price: 99.5 })],
      },
    });
  });

  it("returns not connected when the tenant bridge does not exist", async () => {
    const handler = createBusinessCatalogSnapshotHandler({
      db: { query: vi.fn(async () => ({ rows: [] })) },
      expectedServiceToken: "service-token",
    });
    const req = { get: vi.fn(() => "Bearer service-token"), params: { tenantId: "global-missing" } };
    const res = responseRecorder();

    await handler(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "EXTERNAL_MANAGEMENT_NOT_CONNECTED" });
  });

  it("requires service authentication before reading the tenant", async () => {
    const query = vi.fn();
    const handler = createBusinessCatalogSnapshotHandler({ db: { query }, expectedServiceToken: "service-token" });
    const req = { get: vi.fn(() => "Bearer wrong"), params: { tenantId: "global-tenant" } };
    const res = responseRecorder();

    await handler(req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "forbidden" });
    expect(query).not.toHaveBeenCalled();
  });
});

function responseRecorder() {
  const res: Record<string, ReturnType<typeof vi.fn>> = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}
