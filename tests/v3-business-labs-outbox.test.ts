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

  it.each([
    [{ image_url: "https://cdn.vase.ar/a.jpg" }, "https://cdn.vase.ar/a.jpg"],
    [{ imageUrl: "https://cdn.vase.ar/b.jpg" }, "https://cdn.vase.ar/b.jpg"],
    [{ image: "https://cdn.vase.ar/c.jpg" }, "https://cdn.vase.ar/c.jpg"],
    [{ images: ["https://cdn.vase.ar/d.jpg"] }, "https://cdn.vase.ar/d.jpg"],
    [{ images: [{ url: "https://cdn.vase.ar/e.jpg" }] }, "https://cdn.vase.ar/e.jpg"],
    [{ images: [{ src: "https://cdn.vase.ar/f.jpg" }] }, "https://cdn.vase.ar/f.jpg"],
    [{ images: [{ image_url: "https://cdn.vase.ar/g.jpg" }] }, "https://cdn.vase.ar/g.jpg"],
  ])("maps image data %j to the shared imageUrl contract", (data, expected) => {
    expect(mapBusinessProductForLabs(businessProduct({ data })).imageUrl).toBe(expected);
  });

  it("uses the highest-priority valid image candidate", () => {
    expect(mapBusinessProductForLabs(businessProduct({
      image_url: "https://cdn.vase.ar/legacy.jpg",
      data: {
        image_url: "https://cdn.vase.ar/snake-case.jpg",
        imageUrl: "https://cdn.vase.ar/camel-case.jpg",
        image: "https://cdn.vase.ar/singular.jpg",
        images: ["https://cdn.vase.ar/collection.jpg"],
      },
    })).imageUrl).toBe("https://cdn.vase.ar/legacy.jpg");
  });

  it.each([
    [
      {
        image_url: "http://cdn.vase.ar/insecure.jpg",
        data: { image_url: "https://cdn.vase.ar/snake-case.jpg" },
      },
      "https://cdn.vase.ar/snake-case.jpg",
    ],
    [
      {
        data: {
          image_url: "https://localhost/private.jpg",
          imageUrl: "not a URL",
          image: "https://cdn.vase.ar/singular.jpg",
        },
      },
      "https://cdn.vase.ar/singular.jpg",
    ],
    [
      {
        data: {
          images: [
            "https://127.0.0.1/private.jpg",
            { url: "ftp://cdn.vase.ar/file.jpg" },
            { src: "https://cdn.vase.ar/collection.jpg" },
          ],
        },
      },
      "https://cdn.vase.ar/collection.jpg",
    ],
  ])("falls back from invalid higher-priority candidates in %j", (imageData, expected) => {
    expect(mapBusinessProductForLabs(businessProduct(imageData)).imageUrl).toBe(expected);
  });

  it.each([
    { image_url: "http://cdn.vase.ar/insecure.jpg" },
    { data: { image: "not a URL" } },
    { data: { images: ["ftp://cdn.vase.ar/file.jpg", null, {}] } },
    { data: { image: "https://localhost/product.jpg" } },
    { data: { image: "https://assets.localhost/product.jpg" } },
    { data: { image: "https://catalog.local/product.jpg" } },
    { data: { image: "https://127.0.0.1/product.jpg" } },
    { data: { image: "https://2130706433/product.jpg" } },
    { data: { image: "https://10.0.0.1/product.jpg" } },
    { data: { image: "https://172.16.0.1/product.jpg" } },
    { data: { image: "https://192.168.1.10/product.jpg" } },
    { data: { image: "https://[::1]/product.jpg" } },
    { data: { image: "https://user:pass@cdn.vase.ar/product.jpg" } },
  ])("keeps the product and sets imageUrl to null for invalid image data %j", (imageData) => {
    expect(mapBusinessProductForLabs(businessProduct(imageData))).toMatchObject({
      externalProductId: "erp_1",
      name: "Producto",
      imageUrl: null,
    });
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

function businessProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: "product_1",
    external_id: "erp_1",
    name: "Producto",
    stock: 3,
    updated_at: "2026-07-16T12:00:00.000Z",
    ...overrides,
  };
}
