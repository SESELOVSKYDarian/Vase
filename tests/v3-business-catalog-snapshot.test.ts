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

  it.each([
    [{ image_url: "https://cdn.vase.ar/a.jpg" }, "https://cdn.vase.ar/a.jpg"],
    [{ imageUrl: "https://cdn.vase.ar/b.jpg" }, "https://cdn.vase.ar/b.jpg"],
    [{ image: "https://cdn.vase.ar/c.jpg" }, "https://cdn.vase.ar/c.jpg"],
    [{ images: ["https://cdn.vase.ar/d.jpg"] }, "https://cdn.vase.ar/d.jpg"],
    [{ images: [{ url: "https://cdn.vase.ar/e.jpg" }] }, "https://cdn.vase.ar/e.jpg"],
    [{ images: [{ src: "https://cdn.vase.ar/f.jpg" }] }, "https://cdn.vase.ar/f.jpg"],
    [{ images: [{ image_url: "https://cdn.vase.ar/g.jpg" }] }, "https://cdn.vase.ar/g.jpg"],
  ])("maps Business image data %j", async (data, expected) => {
    const snapshot = await buildSnapshotWithProductData(data);

    expect(snapshot.payload.products[0].imageUrl).toBe(expected);
  });

  it.each([
    [{ image_url: "http://cdn.vase.ar/insecure.jpg" }],
    [{ imageUrl: "not a URL" }],
    [{ image: "ftp://cdn.vase.ar/file.jpg" }],
    [{ images: [null, {}, 42] }],
    [{ image: "https://localhost/product.jpg" }],
    [{ image: "https://assets.localhost/product.jpg" }],
    [{ image: "https://catalog.local/product.jpg" }],
    [{ image: "https://catalog/product.jpg" }],
    [{ image: "https://catalog.example/product.jpg" }],
    [{ image: "https://catalog.invalid/product.jpg" }],
    [{ image: "https://catalog.test/product.jpg" }],
    [{ image: "https://catalog.internal/product.jpg" }],
    [{ image: "https://catalog.home/product.jpg" }],
    [{ image: "https://catalog.lan/product.jpg" }],
    [{ image: "https://127.0.0.1/product.jpg" }],
    [{ image: "https://2130706433/product.jpg" }],
    [{ image: "https://192.168.1.10/product.jpg" }],
    [{ image: "https://[::1]/product.jpg" }],
    [{ image: "https://user:pass@cdn.vase.ar/product.jpg" }],
  ])("drops invalid Business image data %j without dropping the product", async (data) => {
    const snapshot = await buildSnapshotWithProductData(data);

    expect(snapshot.payload.products).toHaveLength(1);
    expect(snapshot.payload.products[0]).toMatchObject({ name: "Producto", imageUrl: null });
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

  it("returns not connected when the bridged tenant has no product sync credential", async () => {
    const query = vi.fn(async () => ({
      rows: [{ id: "business-uuid", external_tenant_id: "global-tenant" }],
    }));
    const findCredential = vi.fn(async () => null);
    const handler = createBusinessCatalogSnapshotHandler({
      db: { query },
      expectedServiceToken: "service-token",
      findCredential,
    });
    const req = { get: vi.fn(() => "Bearer service-token"), params: { tenantId: "global-tenant" } };
    const res = responseRecorder();

    await handler(req, res, vi.fn());

    expect(findCredential).toHaveBeenCalledWith({ query }, "business-uuid");
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "EXTERNAL_MANAGEMENT_NOT_CONNECTED" });
    expect(query).toHaveBeenCalledTimes(1);
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

async function buildSnapshotWithProductData(data: unknown) {
  const query = vi.fn(async (sql: string) => {
    if (sql.includes("from tenants")) {
      return { rows: [{ id: "business-uuid", external_tenant_id: "global-tenant" }] };
    }
    if (sql.includes("from product_cache")) {
      expect(sql).toContain("jsonb_build_object");
      expect(sql).toContain("'images', data->'images'");
      expect(sql).not.toContain("updated_at, data\n");
      return {
        rows: [{
          id: "p1",
          external_id: "erp-1",
          name: "Producto",
          stock: 2,
          data,
          updated_at: "2026-07-22T12:00:00.000Z",
        }],
      };
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  });

  return buildBusinessCatalogSnapshot({
    db: { query },
    tenantReference: "global-tenant",
    createEventId: () => "event-1",
    now: () => new Date("2026-07-22T13:00:00.000Z"),
  });
}

function responseRecorder() {
  const res: Record<string, ReturnType<typeof vi.fn>> = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}
