import { describe, expect, it, vi } from "vitest";
vi.mock("../apps/vase-editor/server/src/db.js", () => ({ pool: { query: vi.fn() } }));
import { mapBusinessProductForLabs, nextCatalogRetryDelayMs } from "../apps/vase-editor/server/src/services/labsCatalogOutboxCore.js";
import { enqueueLabsCatalogSync } from "../apps/vase-editor/server/src/services/labsCatalogOutbox.js";

describe("Business to Labs catalog outbox", () => {
  it("maps Business products to the shared Labs payload", () => {
    expect(mapBusinessProductForLabs({
      id: "product_1",
      external_id: "erp_1",
      sku: "SKU-1",
      name: "Producto",
      description: "Descripcion",
      price: "1200.50",
      stock: 3,
      image_url: "https://cdn.vase.ar/p.jpg",
      category_names: ["Destacados"],
      is_active_source: true,
      updated_at: "2026-07-16T12:00:00.000Z",
    })).toMatchObject({ externalProductId: "erp_1", price: 1200.5, stock: 3, active: true });
  });

  it("uses capped exponential retry delays", () => {
    expect(nextCatalogRetryDelayMs(1)).toBe(5_000);
    expect(nextCatalogRetryDelayMs(4)).toBe(40_000);
    expect(nextCatalogRetryDelayMs(20)).toBe(900_000);
  });

  it("stores with the Business UUID but sends the Vase global tenant ID", async () => {
    const query = vi.fn(async (sql: string, values?: unknown[]) => {
      if (sql.startsWith("create table") || sql.startsWith("create index")) return { rows: [] };
      if (sql.includes("from tenants")) {
        return { rows: [{ id: "business-uuid", external_tenant_id: "global-tenant" }] };
      }
      if (sql.includes("from product_cache")) {
        expect(values).toEqual(["business-uuid"]);
        return { rows: [] };
      }
      if (sql.startsWith("insert into labs_catalog_outbox")) return { rows: [] };
      throw new Error(`Unexpected SQL: ${sql}`);
    });

    await enqueueLabsCatalogSync("business-uuid", {
      db: { query },
      createId: () => "fixed-id",
      now: () => new Date("2026-07-22T13:00:00.000Z"),
    });

    const insert = query.mock.calls.find(([sql]) => sql.startsWith("insert into labs_catalog_outbox"));
    expect(insert?.[1]?.[2]).toBe("business-uuid");
    expect(JSON.parse(String(insert?.[1]?.[3]))).toMatchObject({
      globalTenantId: "global-tenant",
      occurredAt: "2026-07-22T13:00:00.000Z",
    });
  });
});
