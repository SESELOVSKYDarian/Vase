import { describe, expect, it, vi } from "vitest";
import { createRefundService } from "../apps/vase-rest/app/lib/payments/refund-service";

describe("Rest refunds", () => {
  it("links and applies a manual refund without a provider fallback", async () => {
    const finalize = vi.fn(async (_id, value) => value);
    const providerRefund = vi.fn();
    const service = createRefundService({
      findRefund: async () => null,
      prepare: async () => ({
        refundId: "refund_1",
        paymentId: "payment_1",
        tenderType: "CASH",
        paymentAmount: "100.00",
        alreadyRefunded: "0.00",
      }),
      providerRefund,
      markState: vi.fn(),
      finalize,
    });
    await service.refund({
      globalTenantId: "tenant_1",
      branchId: "branch_1",
      paymentId: "payment_1",
      amount: "40.00",
      reason: "Devolución",
      commandId: "refund_cmd_1",
      actorId: "cashier_1",
    });
    expect(providerRefund).not.toHaveBeenCalled();
    expect(finalize).toHaveBeenCalledWith("refund_1", {
      status: "APPLIED",
    });
  });

  it("does not apply a provider refund whose transaction or amount mismatches", async () => {
    const finalize = vi.fn();
    const service = createRefundService({
      findRefund: async () => null,
      prepare: async () => ({
        refundId: "refund_2",
        paymentId: "payment_2",
        tenderType: "MERCADO_PAGO",
        paymentAmount: "100.00",
        alreadyRefunded: "0.00",
        providerOrderId: "order_mp_1",
        providerPaymentId: "payment_mp_1",
      }),
      providerRefund: async () => ({
        orderId: "order_mp_1",
        refundId: "refund_mp_1",
        transactionId: "another_payment",
        amount: "25.00",
        status: "processed",
        response: {},
      }),
      markState: vi.fn(),
      finalize,
    });
    await expect(service.refund({
      globalTenantId: "tenant_1",
      branchId: "branch_1",
      paymentId: "payment_2",
      amount: "25.00",
      reason: "Devolución",
      commandId: "refund_cmd_2",
      actorId: "cashier_1",
    })).rejects.toThrow("REST_REFUND_PROVIDER_MISMATCH");
    expect(finalize).not.toHaveBeenCalled();
  });

  it("keeps a provider refund pending until Mercado Pago reports it processed", async () => {
    const markState = vi.fn(async (_id, value) => value);
    const service = createRefundService({
      findRefund: async () => null,
      prepare: async () => ({
        refundId: "refund_3",
        paymentId: "payment_3",
        tenderType: "MERCADO_PAGO",
        paymentAmount: "100.00",
        alreadyRefunded: "0.00",
        providerOrderId: "order_mp_1",
        providerPaymentId: "payment_mp_1",
      }),
      providerRefund: async () => ({
        orderId: "order_mp_1",
        refundId: "refund_mp_1",
        transactionId: "payment_mp_1",
        amount: "25.00",
        status: "processing",
        response: {},
      }),
      markState,
      finalize: vi.fn(),
    });
    await expect(service.refund({
      globalTenantId: "tenant_1",
      branchId: "branch_1",
      paymentId: "payment_3",
      amount: "25.00",
      reason: "Devolución",
      commandId: "refund_cmd_3",
      actorId: "cashier_1",
    })).resolves.toMatchObject({ status: "PROCESSING" });
    expect(markState).toHaveBeenCalledWith("refund_3", expect.objectContaining({
      status: "PROCESSING",
      providerRefundId: "refund_mp_1",
    }));
  });
});
