import { describe, expect, it } from "vitest";
import { mapBusinessProductForLabs, nextCatalogRetryDelayMs } from "../apps/vase-editor/server/src/services/labsCatalogOutboxCore.js";

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
});
