import { describe, expect, it, vi } from "vitest";
import { createCashService } from "../apps/vase-rest/app/lib/cash/cash-service";

describe("Rest cash drawers", () => {
  it("opens one drawer per branch station and returns an idempotent receipt", async () => {
    const execute = vi.fn(async (input) => ({ id: "drawer_1", ...input }));
    const service = createCashService({
      findReceipt: async (_tenant, key) =>
        key === "open-existing" ? { id: "drawer_existing" } : null,
      findOpenDrawer: async () => null,
      getDrawer: async () => null,
      execute,
    });
    await expect(service.open({
      globalTenantId: "tenant_1",
      branchId: "branch_1",
      stationId: "POS-1",
      openingFloat: "15000.00",
      commandId: "open-1",
      actorId: "cashier_1",
    })).resolves.toMatchObject({ id: "drawer_1" });
    await expect(service.open({
      globalTenantId: "tenant_1",
      branchId: "branch_1",
      stationId: "POS-1",
      openingFloat: "15000.00",
      commandId: "open-existing",
      actorId: "cashier_1",
    })).resolves.toEqual({ id: "drawer_existing" });
    expect(execute).toHaveBeenCalledOnce();
  });

  it("records signed movements and closes with a server-derived variance", async () => {
    const execute = vi.fn(async (input) => input);
    const service = createCashService({
      findReceipt: async () => null,
      findOpenDrawer: async () => null,
      getDrawer: async () => ({
        id: "drawer_1",
        globalTenantId: "tenant_1",
        branchId: "branch_1",
        status: "OPEN",
        revision: 3,
        expectedCash: "17250.00",
      }),
      execute,
    });
    await expect(service.movement({
      globalTenantId: "tenant_1",
      branchId: "branch_1",
      drawerId: "drawer_1",
      type: "PAID_OUT",
      amount: "250.00",
      reason: "Compra urgente",
      expectedRevision: 3,
      commandId: "out-1",
      actorId: "manager_1",
    })).resolves.toMatchObject({ signedAmount: "-250.00" });
    await expect(service.close({
      globalTenantId: "tenant_1",
      branchId: "branch_1",
      drawerId: "drawer_1",
      countedCash: "17000.00",
      expectedRevision: 3,
      commandId: "close-1",
      actorId: "cashier_1",
    })).resolves.toMatchObject({ variance: "-250.00" });
  });

  it("rejects a second open drawer and stale revisions", async () => {
    const service = createCashService({
      findReceipt: async () => null,
      findOpenDrawer: async () => ({ id: "drawer_active" }),
      getDrawer: async () => ({
        id: "drawer_1",
        globalTenantId: "tenant_1",
        branchId: "branch_1",
        status: "OPEN",
        revision: 2,
        expectedCash: "0.00",
      }),
      execute: vi.fn(),
    });
    await expect(service.open({
      globalTenantId: "tenant_1", branchId: "branch_1", stationId: "POS-1",
      openingFloat: "0.00", commandId: "open-2", actorId: "cashier_1",
    })).rejects.toThrow("REST_CASH_DRAWER_ALREADY_OPEN");
    await expect(service.close({
      globalTenantId: "tenant_1", branchId: "branch_1", drawerId: "drawer_1",
      countedCash: "0.00", expectedRevision: 1, commandId: "close-1", actorId: "cashier_1",
    })).rejects.toThrow("REST_CASH_REVISION_CONFLICT");
  });
});

