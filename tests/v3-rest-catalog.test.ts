import { describe, expect, it, vi } from "vitest";
import { createCatalogService } from "../apps/vase-rest/app/lib/catalog/catalog-service";

describe("Rest catalog", () => {
  it("creates tenant-scoped categories and products with immutable SKU", async () => {
    const createProduct = vi.fn(async (input) => ({ id: "product_1", revision: 1, ...input }));
    const updateProduct = vi.fn(async (input) => ({ id: "product_1", ...input, revision: 2 }));
    const service = createCatalogService({
      createCategory: vi.fn(),
      createProduct,
      updateProduct,
      findProduct: async () => ({
        id: "product_1", globalTenantId: "tenant_1", sku: "BURGER", revision: 1,
      }),
    });
    await service.createProduct("tenant_1", {
      categoryId: "category_1", sku: "burger", name: "Burger", available: true,
    });
    expect(createProduct).toHaveBeenCalledWith(expect.objectContaining({ sku: "BURGER" }));
    await expect(service.updateProduct("tenant_1", "product_1", {
      expectedRevision: 1, sku: "CHANGED",
    })).rejects.toThrow("REST_PRODUCT_SKU_IMMUTABLE");
    await expect(service.updateProduct("tenant_2", "product_1", {
      expectedRevision: 1, name: "Ataque",
    })).rejects.toThrow("REST_PRODUCT_NOT_FOUND");
  });

  it("rejects stale product revisions", async () => {
    const service = createCatalogService({
      createCategory: vi.fn(),
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      findProduct: async () => ({
        id: "product_1", globalTenantId: "tenant_1", sku: "BURGER", revision: 4,
      }),
    });
    await expect(service.updateProduct("tenant_1", "product_1", {
      expectedRevision: 3, name: "Nueva",
    })).rejects.toThrow("REST_CATALOG_REVISION_CONFLICT");
  });
});
