import { describe, expect, it } from "vitest";
import {
  arcaVatRateId,
  arcaVoucherType,
  fiscalQrPayload,
  fiscalQrUrl,
} from "../apps/vase-rest/app/lib/fiscal/fiscal-mapping";

describe("Rest ARCA mappings", () => {
  it("maps every supported invoice family and VAT aliquot to WSFE codes", () => {
    expect(arcaVoucherType("INVOICE_A")).toBe(1);
    expect(arcaVoucherType("CREDIT_NOTE_B")).toBe(8);
    expect(arcaVoucherType("DEBIT_NOTE_C")).toBe(12);
    expect(arcaVatRateId("2.50")).toBe(9);
    expect(arcaVatRateId("21.00")).toBe(5);
    expect(() => arcaVatRateId("7.00")).toThrow("REST_ARCA_VAT_RATE_UNSUPPORTED");
  });

  it("creates the official version-one QR payload without inventing authorization data", () => {
    const payload = fiscalQrPayload({
      date: "20260728",
      cuit: "30712345678",
      pointOfSale: 3,
      voucherType: 6,
      voucherNumber: 150,
      total: "1210.00",
      currency: "PES",
      currencyRate: "1.000000",
      recipientDocType: 99,
      recipientDocNumber: "0",
      cae: "74123456789012",
    });
    expect(payload).toMatchObject({
      ver: 1,
      fecha: "2026-07-28",
      ptoVta: 3,
      tipoCmp: 6,
      nroCmp: 150,
      tipoCodAut: "E",
      codAut: 74123456789012,
    });
    const encoded = fiscalQrUrl(payload).split("?p=")[1]!;
    expect(JSON.parse(Buffer.from(encoded, "base64").toString("utf8"))).toEqual(payload);
  });
});
