import { describe, expect, it } from "vitest";
import { getTransferDetails, safeReceiptName, sniffReceiptType } from "@/lib/billing/transfer";
import { extendOneMonth } from "@/server/services/billing-activation";

const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)]);

describe("pago por transferencia", () => {
  it("solo se ofrece si hay alias o CBU", () => {
    expect(getTransferDetails({})).toBeNull();
    expect(getTransferDetails({ VASE_TRANSFER_HOLDER: "Vase" })).toBeNull();
    expect(getTransferDetails({ VASE_TRANSFER_ALIAS: " vase.pagos ", VASE_TRANSFER_HOLDER: "Vase SAS" })).toEqual({
      alias: "vase.pagos",
      cbu: null,
      holder: "Vase SAS",
      bank: null,
      taxId: null,
    });
  });

  it("acepta fotos y PDF por su contenido real, nada más", () => {
    expect(sniffReceiptType(bytes(0xff, 0xd8, 0xff))).toBe("image/jpeg");
    expect(sniffReceiptType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
    expect(sniffReceiptType(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))).toBe("image/webp");
    expect(sniffReceiptType(bytes(0x25, 0x50, 0x44, 0x46, 0x2d))).toBe("application/pdf");
    expect(sniffReceiptType(new TextEncoder().encode("<html><script>alert(1)</script></html>"))).toBeNull();
    expect(sniffReceiptType(bytes(0x47, 0x49, 0x46, 0x38))).toBeNull();
  });

  it("guarda un nombre seguro con la extensión del tipo real", () => {
    expect(safeReceiptName("C:\\fakepath\\Transferencia Nov.jpeg", "image/jpeg")).toBe("Transferencia Nov.jpg");
    expect(safeReceiptName("../../etc/passwd", "application/pdf")).toBe("passwd.pdf");
    expect(safeReceiptName("comprobante<script>.html", "image/png")).toBe("comprobantescript.png");
    expect(safeReceiptName("", "image/webp")).toBe("comprobante.webp");
  });
});

describe("al pagar, el período se corre un mes", () => {
  const now = new Date(2026, 10, 19);

  it("desde hoy si el período ya venció o no había", () => {
    expect(extendOneMonth(null, now)).toEqual(new Date(2026, 11, 19));
    expect(extendOneMonth(new Date(2026, 9, 1), now)).toEqual(new Date(2026, 11, 19));
  });

  it("desde el fin del período si todavía no venció", () => {
    expect(extendOneMonth(new Date(2026, 11, 5), now)).toEqual(new Date(2027, 0, 5));
  });

  it("del 31 de enero pasa al último día de febrero", () => {
    expect(extendOneMonth(new Date(2027, 0, 31), now)).toEqual(new Date(2027, 1, 28));
  });
});
