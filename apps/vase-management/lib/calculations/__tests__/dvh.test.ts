import { describe, it, expect } from "vitest";
import { computeDvhItem, computeDvhQuote } from "../dvh";
import type { DvhItemInput } from "../types";

function baseInput(overrides: Partial<DvhItemInput> = {}): DvhItemInput {
  return {
    id: "1",
    composicion: "4/12/4",
    vidrioExterior: { tipo: "Float 4mm", espesorMm: 4, precioM2: 12000 },
    vidrioInterior: { tipo: "Float 4mm", espesorMm: 4, precioM2: 12000 },
    camara: "12mm",
    separador: "ALUMINIO",
    sellado: "SIMPLE",
    cantidad: 4,
    anchoMm: 1000,
    altoMm: 1000,
    precioSeparadorMl: 1500,
    precioSelladoMl: 800,
    costoInsumosExtraUnitario: 500,
    margenPct: 30,
    bonificacionPct: 0,
    ...overrides,
  };
}

describe("computeDvhItem", () => {
  it("calcula m², perímetro y espesor total de la composición", () => {
    const r = computeDvhItem(baseInput());
    expect(r.m2Unitario).toBe(1); // 1m x 1m
    expect(r.m2Total).toBe(4);
    expect(r.perimetroMl).toBe(4); // 2*(1+1)
    expect(r.espesorTotalMm).toBe(4 + 4 + 12); // vidrios + cámara
  });

  it("compone el costo unitario a partir de vidrios + insumos", () => {
    const r = computeDvhItem(baseInput());
    // vidrio ext: 1m² x 12000 = 12000 | vidrio int: 12000
    // separador: 4ml x 1500 = 6000 | sellado: 4ml x 800 = 3200
    // insumos extra: 500
    const esperado = 12000 + 12000 + 6000 + 3200 + 500;
    expect(r.costoTotalUnitario).toBe(esperado);
    expect(r.costoTotal).toBe(esperado * 4);
  });

  it("aplica el margen comercial y la bonificación sobre el precio de venta", () => {
    const r = computeDvhItem(baseInput({ margenPct: 30, bonificacionPct: 10 }));
    const costoUnit = 12000 + 12000 + 6000 + 3200 + 500; // 33700
    const precioVenta = costoUnit * 1.3;
    expect(r.precioVentaUnitario).toBeCloseTo(precioVenta, 2);
    const subtotalBruto = precioVenta * 4;
    expect(r.subtotalBruto).toBeCloseTo(subtotalBruto, 1);
    expect(r.montoBonificacion).toBeCloseTo(subtotalBruto * 0.1, 1);
    expect(r.subtotalNeto).toBeCloseTo(subtotalBruto * 0.9, 1);
  });
});

describe("computeDvhQuote", () => {
  it("totaliza costo, subtotal, IVA y total de varios ítems", () => {
    const { totals } = computeDvhQuote([baseInput({ id: "1" }), baseInput({ id: "2", cantidad: 2, margenPct: 25 })]);
    expect(totals.cantidadTotalUnidades).toBe(6);
    expect(totals.m2Total).toBe(6);
    expect(totals.iva).toBeCloseTo(totals.subtotalNeto * 0.21, 1);
    expect(totals.total).toBeCloseTo(totals.subtotalNeto + totals.iva, 1);
  });
});

