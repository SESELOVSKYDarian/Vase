import { describe, expect, it } from "vitest";
import { extendOneMonth } from "@/server/services/billing-activation";
import { normalizeAutoDebitStatus } from "@/server/services/mercadopago-autodebit";

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

describe("débito automático", () => {
  it("solo guarda estados conocidos de Mercado Pago", () => {
    expect(normalizeAutoDebitStatus("authorized")).toBe("authorized");
    expect(normalizeAutoDebitStatus("paused")).toBe("paused");
    expect(normalizeAutoDebitStatus("cancelled")).toBe("cancelled");
    expect(normalizeAutoDebitStatus("algo-raro")).toBe("pending");
    expect(normalizeAutoDebitStatus(undefined)).toBe("pending");
  });
});
