import { describe, expect, it, vi } from "vitest";
import { createInventoryService } from "../apps/vase-rest/app/lib/inventory/inventory-service";

describe("Rest append-only inventory", () => {
  it.each(["RECEIPT", "RECIPE_CONSUMPTION", "WASTE", "CORRECTION"] as const)(
    "records %s through one transactional movement",
    async (kind) => {
      const append = vi.fn(async (input) => ({
        movementId: "move_1",
        balance: input.quantity,
      }));
      const service = createInventoryService({ append, findMovement: vi.fn(), reverse: vi.fn() });
      await service.record({
        globalTenantId: "tenant_1",
        warehouseId: "warehouse_1",
        ingredientId: "ingredient_1",
        kind,
        quantity: kind === "RECEIPT" || kind === "CORRECTION" ? "10.000" : "-1.000",
        commandId: `${kind}_1`,
        actorId: "staff_1",
      });
      expect(append).toHaveBeenCalledTimes(1);
    },
  );

  it("reverses once with a compensating movement and never edits history", async () => {
    const reverse = vi.fn(async () => ({ movementId: "move_reverse" }));
    const service = createInventoryService({
      append: vi.fn(),
      findMovement: async () => ({
        id: "move_1",
        globalTenantId: "tenant_1",
        reversedById: null,
      }),
      reverse,
    });
    await service.reverse({
      globalTenantId: "tenant_1",
      movementId: "move_1",
      commandId: "reverse_1",
      actorId: "manager_1",
      reason: "Carga incorrecta",
    });
    expect(reverse).toHaveBeenCalledWith(expect.objectContaining({
      originalMovementId: "move_1",
    }));
  });
});
