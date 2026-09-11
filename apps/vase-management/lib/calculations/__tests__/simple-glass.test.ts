import { describe, it, expect } from "vitest";
import { computeSimpleGlassItem, computeSimpleGlassQuote, buildPulidoObservation } from "../simple-glass";

describe("computeSimpleGlassItem", () => {
  it("calcula m² y subtotal de un vidrio sin pulido", () => {
    const r = computeSimpleGlassItem({
      id: "1",
      producto: "Float 4mm",
      cantidad: 10,
      anchoMm: 1000,
      altoMm: 800,
      carasPulidasAncho: 0,
      carasPulidasAlto: 0,
      precioM2: 15000,
      precioPulidoMl: 2500,
      bonificacionPct: 0,
    });
    // 1m x 0.8m = 0.8 m² por unidad -> 8 m² totales
    expect(r.m2Unitario).toBe(0.8);
    expect(r.m2Total).toBe(8);
    expect(r.subtotalVidrio).toBe(8 * 15000);
    expect(r.metrosLinealesPulido).toBe(0);
    expect(r.subtotalPulido).toBe(0);
    expect(r.subtotalBruto).toBe(120000);
    expect(r.subtotalNeto).toBe(120000);
    expect(r.observacionesPulido).toBe("Sin pulido");
  });

  it("calcula metros lineales de pulido según caras seleccionadas", () => {
    const r = computeSimpleGlassItem({
      id: "2",
      producto: "Float 6mm",
      cantidad: 2,
      anchoMm: 1000,
      altoMm: 500,
      carasPulidasAncho: 2, // ambos lados de 1m
      carasPulidasAlto: 1, // un lado de 0.5m
      precioM2: 20000,
      precioPulidoMl: 3000,
      bonificacionPct: 0,
    });
    // por unidad: 2*1 + 1*0.5 = 2.5 ml, x 2 unidades = 5 ml
    expect(r.metrosLinealesPulido).toBe(5);
    expect(r.subtotalPulido).toBe(5 * 3000);
    expect(r.observacionesPulido).toContain("2 caras de ancho");
    expect(r.observacionesPulido).toContain("1 cara de alto");
  });

  it("aplica bonificación sobre el subtotal bruto (vidrio + pulido)", () => {
    const r = computeSimpleGlassItem({
      id: "3",
      producto: "Float 4mm",
      cantidad: 1,
      anchoMm: 1000,
      altoMm: 1000,
      carasPulidasAncho: 0,
      carasPulidasAlto: 0,
      precioM2: 10000,
      precioPulidoMl: 0,
      bonificacionPct: 10,
    });
    expect(r.subtotalBruto).toBe(10000);
    expect(r.montoBonificacion).toBe(1000);
    expect(r.subtotalNeto).toBe(9000);
  });
});

describe("buildPulidoObservation", () => {
  it("informa sin pulido cuando no hay caras seleccionadas", () => {
    expect(buildPulidoObservation(0, 0)).toBe("Sin pulido");
  });
  it("combina ambos ejes en la observación", () => {
    const obs = buildPulidoObservation(1, 2);
    expect(obs).toContain("1 cara de ancho");
    expect(obs).toContain("2 caras de alto");
  });
});

describe("computeSimpleGlassQuote", () => {
  it("totaliza cantidad, m², IVA y total de varios ítems", () => {
    const { totals } = computeSimpleGlassQuote([
      {
        id: "1",
        producto: "Float 4mm",
        cantidad: 5,
        anchoMm: 1000,
        altoMm: 1000,
        carasPulidasAncho: 0,
        carasPulidasAlto: 0,
        precioM2: 10000,
        precioPulidoMl: 0,
        bonificacionPct: 0,
      },
      {
        id: "2",
        producto: "Float 6mm",
        cantidad: 3,
        anchoMm: 500,
        altoMm: 500,
        carasPulidasAncho: 0,
        carasPulidasAlto: 0,
        precioM2: 20000,
        precioPulidoMl: 0,
        bonificacionPct: 0,
      },
    ]);
    // item1: 5 m² x 10000 = 50000 | item2: 0.75 m² x 20000 = 15000
    expect(totals.cantidadTotalVidrios).toBe(8);
    expect(totals.m2Total).toBe(5.75);
    expect(totals.subtotalBruto).toBe(65000);
    expect(totals.subtotalNeto).toBe(65000);
    expect(totals.iva).toBe(13650); // 21%
    expect(totals.total).toBe(78650);
  });
});

