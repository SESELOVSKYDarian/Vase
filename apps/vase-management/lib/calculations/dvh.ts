import Decimal from "decimal.js";
import type { DvhItemInput, DvhItemComputed, DvhQuoteTotals } from "./types";

const IVA_RATE = 0.21;

const CAMARA_MM: Record<DvhItemInput["camara"], number> = {
  "9mm": 9,
  "12mm": 12,
  "15mm": 15,
  "16mm": 16,
};
export const CAMARA_PRECIOS_ML: Record<DvhItemInput["camara"], number> = { "9mm": 1100, "12mm": 1350, "15mm": 1550, "16mm": 1700 };

/**
 * Motor de cálculo de DVH (Doble Vidriado Hermético).
 *
 * Traduce a funciones puras y testeables la lógica que en
 * "Presup dvh.xlsx" vivía repartida entre las hojas "CALCULO DVH" e
 * "$ INSUMOS".
 *
 * Reglas replicadas:
 *  - El costo unitario se compone de: vidrio exterior + vidrio interior
 *    + separador (perímetro x precio/ml) + sellado (perímetro x precio/ml)
 *    + insumos extra (gas, esquineros, desecante, etc.).
 *  - El precio de venta surge de aplicar un margen comercial configurable
 *    sobre el costo (en el Excel esto se resolvía con una fórmula de
 *    markup fija por composición; acá queda parametrizado por ítem para
 *    poder reflejar distintas políticas comerciales sin tocar código).
 *  - El espesor total se informa a fines de armado/corte (composición
 *    real del vidrio) sumando espesores de ambos vidrios + cámara.
 *  - La bonificación se aplica igual que en vidrio simple: % sobre el
 *    subtotal bruto de venta (nunca sobre el costo).
 */
export function computeDvhItem(input: DvhItemInput): DvhItemComputed {
  const anchoM = new Decimal(input.anchoMm).div(1000);
  const altoM = new Decimal(input.altoMm).div(1000);
  const cantidad = new Decimal(input.cantidad);

  const m2Unitario = anchoM.mul(altoM);
  const m2Total = m2Unitario.mul(cantidad);
  const perimetroMl = anchoM.plus(altoM).mul(2);

  const costoVidrioExteriorUnitario = m2Unitario.mul(input.vidrioExterior.precioM2);
  const costoVidrioInteriorUnitario = m2Unitario.mul(input.vidrioInterior.precioM2);
  const costoCamaraUnitario = perimetroMl.mul(input.precioCamaraMl ?? 0);
  const costoSeparadorUnitario = perimetroMl.mul(input.precioSeparadorMl);
  const costoSelladoUnitario = perimetroMl.mul(input.precioSelladoMl);
  const costoManoObraUnitario = m2Unitario.mul(input.costoManoObraM2 ?? 0);
  const recargoTamanoPct = m2Unitario.gt(6.49) ? 30 : m2Unitario.gt(4.49) ? 20 : 0;

  const costoTotalUnitario = costoVidrioExteriorUnitario
    .plus(costoVidrioInteriorUnitario)
    .plus(costoCamaraUnitario)
    .plus(costoSeparadorUnitario)
    .plus(costoSelladoUnitario)
    .plus(input.costoInsumosExtraUnitario)
    .plus(costoManoObraUnitario);

  const costoConRecargoUnitario = costoTotalUnitario.mul(new Decimal(1).plus(new Decimal(recargoTamanoPct).div(100)));

  const costoTotal = costoConRecargoUnitario.mul(cantidad);

  const precioVentaUnitario = costoConRecargoUnitario.mul(new Decimal(1).plus(new Decimal(input.margenPct).div(100)));
  const subtotalBrutoUnitario = precioVentaUnitario;
  const subtotalBruto = subtotalBrutoUnitario.mul(cantidad);

  const montoBonificacion = subtotalBruto.mul(input.bonificacionPct).div(100);
  const subtotalNeto = subtotalBruto.minus(montoBonificacion);

  const espesorTotalMm = input.vidrioExterior.espesorMm + input.vidrioInterior.espesorMm + CAMARA_MM[input.camara];

  return {
    ...input,
    espesorTotalMm,
    m2Unitario: round(m2Unitario),
    m2Total: round(m2Total),
    perimetroMl: round(perimetroMl),
    costoVidrioExteriorUnitario: round(costoVidrioExteriorUnitario),
    costoVidrioInteriorUnitario: round(costoVidrioInteriorUnitario),
    costoSeparadorUnitario: round(costoSeparadorUnitario),
    costoCamaraUnitario: round(costoCamaraUnitario),
    costoSelladoUnitario: round(costoSelladoUnitario),
    costoManoObraUnitario: round(costoManoObraUnitario),
    recargoTamanoPct,
    costoTotalUnitario: round(costoConRecargoUnitario),
    costoTotal: round(costoTotal),
    precioVentaUnitario: round(precioVentaUnitario),
    subtotalBruto: round(subtotalBruto),
    montoBonificacion: round(montoBonificacion),
    subtotalNeto: round(subtotalNeto),
  };
}

export function computeDvhQuote(
  items: DvhItemInput[],
  ivaRate: number = IVA_RATE
): { items: DvhItemComputed[]; totals: DvhQuoteTotals } {
  const computed = items.map(computeDvhItem);

  const cantidadTotalUnidades = computed.reduce((acc, i) => acc + i.cantidad, 0);
  const m2Total = round(computed.reduce((acc, i) => new Decimal(acc).plus(i.m2Total), new Decimal(0)));
  const costoTotal = round(computed.reduce((acc, i) => new Decimal(acc).plus(i.costoTotal), new Decimal(0)));
  const subtotalBruto = round(
    computed.reduce((acc, i) => new Decimal(acc).plus(i.subtotalBruto), new Decimal(0))
  );
  const montoBonificacion = round(
    computed.reduce((acc, i) => new Decimal(acc).plus(i.montoBonificacion), new Decimal(0))
  );
  const subtotalNeto = round(new Decimal(subtotalBruto).minus(montoBonificacion));
  const iva = round(new Decimal(subtotalNeto).mul(ivaRate));
  const total = round(new Decimal(subtotalNeto).plus(iva));

  return {
    items: computed,
    totals: {
      cantidadTotalUnidades,
      m2Total,
      costoTotal,
      subtotalBruto,
      montoBonificacion,
      subtotalNeto,
      iva,
      total,
    },
  };
}

function round(value: Decimal | number): number {
  return new Decimal(value).toDecimalPlaces(2).toNumber();
}

