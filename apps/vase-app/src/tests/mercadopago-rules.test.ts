import { describe, expect, it } from "vitest";
import {
  amountDue,
  buildPaymentReference,
  isMercadoPagoPaymentId,
  isSettleablePayment,
  nextPaymentState,
  parsePaymentReference,
  paymentResultMessage,
} from "@/lib/billing/mercadopago-rules";

describe("mercado pago rules", () => {
  it("round-trips the payment reference and rejects foreign ones", () => {
    expect(parsePaymentReference(buildPaymentReference("abc"))).toBe("abc");
    expect(parsePaymentReference("otra-cosa")).toBeNull();
    expect(parsePaymentReference(undefined)).toBeNull();
  });

  it("only settles approved ARS payments", () => {
    const base = { status: "approved", currency_id: "ARS", transaction_amount: 100 };
    expect(isSettleablePayment(base)).toBe(true);
    expect(isSettleablePayment({ ...base, status: "pending" })).toBe(false);
    expect(isSettleablePayment({ ...base, currency_id: "USD" })).toBe(false);
    expect(isSettleablePayment({ ...base, transaction_amount: 0 })).toBe(false);
  });

  it("computes what is still due", () => {
    expect(amountDue(120000, 20000)).toBe(100000);
    expect(amountDue(100, 150)).toBe(0);
  });

  it("marks settled only when fully paid and never over-credits", () => {
    expect(nextPaymentState({ total: 100, paid: 0, received: 40 })).toEqual({ paid: 40, settled: false });
    expect(nextPaymentState({ total: 100, paid: 40, received: 60 })).toEqual({ paid: 100, settled: true });
    expect(nextPaymentState({ total: 100, paid: 90, received: 60 })).toEqual({ paid: 100, settled: true });
  });

  it("accepts only numeric Mercado Pago ids", () => {
    expect(isMercadoPagoPaymentId("12345")).toBe(true);
    expect(isMercadoPagoPaymentId("12345/../x")).toBe(false);
    expect(isMercadoPagoPaymentId(12345)).toBe(false);
  });

  it("explains payment outcomes", () => {
    expect(paymentResultMessage("approved").ok).toBe(true);
    expect(paymentResultMessage("in_process").ok).toBe(true);
    expect(paymentResultMessage("rejected").ok).toBe(false);
  });
});
