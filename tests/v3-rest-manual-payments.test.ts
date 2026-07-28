import { describe, expect, it, vi } from "vitest";
import { createPaymentService } from "../apps/vase-rest/app/lib/payments/payment-service";

describe("Rest manual payments", () => {
  it("requires traceability for external tenders and applies exact decimal amounts", async () => {
    const execute = vi.fn(async (input) => ({ id: "payment_1", ...input }));
    const service = createPaymentService({
      findReceipt: async () => null,
      getOrder: async () => ({
        id: "order_1", globalTenantId: "tenant_1", branchId: "branch_1",
        status: "READY", total: "10500.50", paidTotal: "0.00",
      }),
      getOpenDrawer: async () => ({ id: "drawer_1" }),
      execute,
    });
    await expect(service.apply({
      globalTenantId: "tenant_1", branchId: "branch_1", orderId: "order_1",
      tenderType: "BANK_TRANSFER", amount: "10500.50",
      provider: "Banco Nación", reference: "TRX-991", operator: "Terminal 1",
      commandId: "pay-1", actorId: "cashier_1",
    })).resolves.toMatchObject({ amount: "10500.50" });
    await expect(service.apply({
      globalTenantId: "tenant_1", branchId: "branch_1", orderId: "order_1",
      tenderType: "EXTERNAL_WALLET", amount: "100.00",
      commandId: "pay-2", actorId: "cashier_1",
    })).rejects.toThrow("REST_PAYMENT_REFERENCE_REQUIRED");
  });

  it("requires an open drawer for cash and prevents overpayment", async () => {
    const repository = {
      findReceipt: async () => null,
      getOrder: async () => ({
        id: "order_1", globalTenantId: "tenant_1", branchId: "branch_1",
        status: "READY", total: "100.00", paidTotal: "90.00",
      }),
      getOpenDrawer: async () => null,
      execute: vi.fn(),
    };
    const service = createPaymentService(repository);
    await expect(service.apply({
      globalTenantId: "tenant_1", branchId: "branch_1", orderId: "order_1",
      tenderType: "CASH", amount: "10.00", commandId: "pay-cash",
      actorId: "cashier_1",
    })).rejects.toThrow("REST_CASH_DRAWER_REQUIRED");
    repository.getOpenDrawer = async () => ({ id: "drawer_1" });
    await expect(service.apply({
      globalTenantId: "tenant_1", branchId: "branch_1", orderId: "order_1",
      tenderType: "CASH", amount: "10.01", commandId: "pay-over",
      actorId: "cashier_1",
    })).rejects.toThrow("REST_PAYMENT_EXCEEDS_BALANCE");
  });
});
