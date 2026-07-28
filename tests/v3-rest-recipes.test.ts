import { describe, expect, it, vi } from "vitest";
import { createRecipeService } from "../apps/vase-rest/app/lib/catalog/recipe-service";

describe("Rest recipes", () => {
  it("persists positive decimal quantities and replaces a recipe atomically", async () => {
    const replace = vi.fn(async (input) => ({ ...input, revision: 2 }));
    const service = createRecipeService({ replace });
    await service.replace({
      globalTenantId: "tenant_1",
      productId: "product_1",
      expectedRevision: 1,
      items: [
        { ingredientId: "ingredient_1", quantity: "0.150", unit: "KG" },
        { ingredientId: "ingredient_2", quantity: "1", unit: "UNIT" },
      ],
    });
    expect(replace).toHaveBeenCalledWith(expect.objectContaining({
      items: expect.arrayContaining([
        expect.objectContaining({ quantity: "0.150" }),
      ]),
    }));
    await expect(service.replace({
      globalTenantId: "tenant_1",
      productId: "product_1",
      expectedRevision: 1,
      items: [{ ingredientId: "ingredient_1", quantity: "0", unit: "KG" }],
    })).rejects.toThrow();
  });
});
