import { describe, expect, it } from "vitest";
import { receiptNumber, receiptVerificationCode, renderReceiptPdf } from "@/lib/billing/receipt-pdf";

describe("comprobante de pago en PDF", () => {
  const input = {
    paymentId: "cmabc123xyz9876",
    concept: "Prueba de pago (Vase)",
    total: 100,
    paid: 100,
    issuedAt: new Date(2026, 10, 23),
    customer: { name: "Vase Pruebas", legalName: null, taxId: "20-12345678-9", email: "pruebas@vase.ar" },
    items: [{ paidAt: new Date(2026, 10, 23), method: "Mercado Pago", reference: "Operación 123456", amount: 100 }],
  };

  it("arma un PDF válido que aclara que no es una factura", () => {
    const pdf = renderReceiptPdf(input).toString("latin1");
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf.trimEnd().endsWith("%%EOF")).toBe(true);
    expect(pdf).toContain("COMPROBANTE DE PAGO");
    expect(pdf).toContain("No es una factura");
    expect(pdf).toContain(receiptNumber(input.paymentId));
  });

  it("el número sale del id de la factura", () => {
    expect(receiptNumber("cmabc123xyz9876")).toBe("VC-3XYZ9876");
  });

  it("el código de verificación cambia si cambia el monto", () => {
    const a = receiptVerificationCode("cm1", 100, "secreto");
    expect(a).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(receiptVerificationCode("cm1", 100, "secreto")).toBe(a);
    expect(receiptVerificationCode("cm1", 1000, "secreto")).not.toBe(a);
  });
});
