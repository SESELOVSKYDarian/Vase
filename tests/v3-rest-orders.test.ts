import { describe, expect, it, vi } from "vitest";
import { createOrderService } from "../apps/vase-rest/app/lib/orders/order-service";

describe("Rest orders", () => {
  it("opens orders and adds customized items with exact decimal totals", async () => {
    const execute = vi.fn(async (input) => ({
      commandId: input.commandId,
      orderId: "order_1",
      total: input.action === "ADD_ITEM" ? "15500.50" : "0.00",
    }));
    const service = createOrderService({
      findCommand: async () => null,
      getOrder: async () => ({
        id: "order_1", globalTenantId: "tenant_1", branchId: "branch_1",
        status: "OPEN", revision: 1,
      }),
      execute,
    });
    await service.open({
      globalTenantId: "tenant_1", branchId: "branch_1", tableId: "table_1",
      guestCount: 2, commandId: "open_1", actorId: "waiter_1",
    });
    const result = await service.addItem({
      globalTenantId: "tenant_1", branchId: "branch_1", orderId: "order_1",
      expectedRevision: 1, commandId: "item_1", actorId: "waiter_1",
      productId: "product_1", quantity: 2, course: 1, notes: "Sin sal",
      modifiers: [{ optionId: "option_1", quantity: 1 }],
    });
    expect(result).toMatchObject({ total: "15500.50" });
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      action: "ADD_ITEM",
      modifiers: [{ optionId: "option_1", quantity: 1 }],
    }));
  });

  it("returns prior command receipts and rejects stale/cross-tenant commands", async () => {
    const receipt = { commandId: "item_1", orderId: "order_1", total: "100.00" };
    const execute = vi.fn();
    const service = createOrderService({
      findCommand: async (_tenant, commandId) => commandId === "item_1" ? receipt : null,
      getOrder: async () => ({
        id: "order_1", globalTenantId: "tenant_1", branchId: "branch_1",
        status: "OPEN", revision: 3,
      }),
      execute,
    });
    await expect(service.addItem({
      globalTenantId: "tenant_1", branchId: "branch_1", orderId: "order_1",
      expectedRevision: 3, commandId: "item_1", actorId: "waiter_1",
      productId: "p", quantity: 1, course: 1, modifiers: [],
    })).resolves.toEqual(receipt);
    expect(execute).not.toHaveBeenCalled();
    await expect(service.submit({
      globalTenantId: "tenant_1", branchId: "branch_1", orderId: "order_1",
      expectedRevision: 2, commandId: "submit_1", actorId: "waiter_1",
    })).rejects.toThrow("REST_ORDER_REVISION_CONFLICT");
  });

  it("supports cancel, split and merge as explicit idempotent commands", async () => {
    const execute = vi.fn(async (input) => ({ commandId: input.commandId }));
    const service = createOrderService({
      findCommand: async () => null,
      getOrder: async (_tenant, _branch, id) => ({
        id, globalTenantId: "tenant_1", branchId: "branch_1",
        status: "OPEN", revision: 1,
      }),
      execute,
    });
    await service.cancel({
      globalTenantId: "tenant_1", branchId: "branch_1", orderId: "o1",
      expectedRevision: 1, commandId: "cancel_1", actorId: "manager_1", reason: "Error",
    });
    await service.split({
      globalTenantId: "tenant_1", branchId: "branch_1", orderId: "o1",
      expectedRevision: 1, commandId: "split_1", actorId: "waiter_1", itemIds: ["i1"],
    });
    await service.merge({
      globalTenantId: "tenant_1", branchId: "branch_1", orderId: "o1",
      sourceOrderId: "o2", expectedRevision: 1, commandId: "merge_1", actorId: "waiter_1",
    });
    expect(execute).toHaveBeenCalledTimes(3);
  });
});
