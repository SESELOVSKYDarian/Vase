import { describe, expect, it } from "vitest";
import {
  buildReconciliation,
  csvCell,
} from "../apps/vase-rest/app/lib/payments/reconciliation-service";

describe("Rest reconciliation", () => {
  it("finds provider, payment, fiscal, and refund discrepancies", () => {
    const result = buildReconciliation({
      fiscalConfigured: true,
      orders: [
        { id: "order_1", status: "PAID", total: "100.00" },
        { id: "order_2", status: "PAID", total: "50.00" },
      ],
      payments: [{
        id: "payment_1",
        orderId: "order_1",
        status: "APPLIED",
        provider: "MERCADO_PAGO",
        reference: "provider_payment_wrong",
        amount: "100.00",
      }],
      attempts: [{
        orderId: "order_1",
        status: "APPLIED",
        providerPaymentId: "provider_payment_1",
      }],
      fiscalDocuments: [],
      refunds: [{
        id: "refund_1",
        paymentId: "payment_1",
        status: "AMBIGUOUS",
        amount: "20.00",
      }],
    });
    expect(result.discrepancies.map((item) => item.code)).toEqual(expect.arrayContaining([
      "PROVIDER_PAYMENT_MISMATCH",
      "ORDER_BALANCE_MISMATCH",
      "FISCAL_DOCUMENT_MISSING",
      "REFUND_UNRESOLVED",
    ]));
  });

  it("escapes spreadsheet formulas in CSV exports", () => {
    expect(csvCell("=HYPERLINK(\"https://evil\")")).toBe(
      "\"'=HYPERLINK(\"\"https://evil\"\")\"",
    );
    expect(csvCell("Cliente normal")).toBe("\"Cliente normal\"");
  });
});
