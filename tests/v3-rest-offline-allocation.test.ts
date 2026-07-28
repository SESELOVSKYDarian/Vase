import { describe, expect, it, vi } from "vitest";
import { createAllocationService } from "../apps/vase-rest/app/lib/inventory/allocation-service";

describe("Rest branch offline inventory allocation", () => {
  it("supports a shared warehouse while enforcing independent branch safety stock", async () => {
    const reserve = vi.fn(async (input) => ({
      remaining: String(Number(input.available) - Number(input.quantity)),
    }));
    const service = createAllocationService({
      get: async () => ({
        globalTenantId: "tenant_1",
        branchId: "branch_1",
        warehouseId: "shared_warehouse",
        ingredientId: "ingredient_1",
        available: "5.000",
        safetyStock: "1.000",
        revision: 3,
      }),
      reserve,
    });
    await expect(service.reserve({
      globalTenantId: "tenant_1",
      branchId: "branch_1",
      ingredientId: "ingredient_1",
      quantity: "4.000",
      expectedRevision: 3,
      commandId: "sale_1",
    })).resolves.toEqual({ remaining: "1" });
    await expect(service.reserve({
      globalTenantId: "tenant_1",
      branchId: "branch_1",
      ingredientId: "ingredient_1",
      quantity: "4.100",
      expectedRevision: 3,
      commandId: "sale_2",
    })).rejects.toThrow("REST_OFFLINE_ALLOCATION_EXHAUSTED");
  });

  it("rejects stale allocation revisions and cross-tenant reads", async () => {
    const service = createAllocationService({
      get: async () => ({
        globalTenantId: "tenant_1",
        branchId: "branch_1",
        warehouseId: "warehouse_1",
        ingredientId: "ingredient_1",
        available: "5.000",
        safetyStock: "0.000",
        revision: 4,
      }),
      reserve: vi.fn(),
    });
    await expect(service.reserve({
      globalTenantId: "tenant_2",
      branchId: "branch_1",
      ingredientId: "ingredient_1",
      quantity: "1.000",
      expectedRevision: 4,
      commandId: "sale_1",
    })).rejects.toThrow("REST_ALLOCATION_NOT_FOUND");
    await expect(service.reserve({
      globalTenantId: "tenant_1",
      branchId: "branch_1",
      ingredientId: "ingredient_1",
      quantity: "1.000",
      expectedRevision: 3,
      commandId: "sale_2",
    })).rejects.toThrow("REST_INVENTORY_REVISION_CONFLICT");
  });
});
