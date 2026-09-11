import Decimal from "decimal.js";
import type {
  SimpleGlassItemInput,
  SimpleGlassItemComputed,
  SimpleGlassQuoteTotals,
} from "./types";

const IVA_RATE = 0.21;

/**
 * Motor de cálculo de Vidrio Simple.
 *
 * Traduce a funciones puras y testeables la lógica que en
 * "P. PRESUPUESTO vidrio simple REV TM1.xlsx" vivía como fórmulas de celda.
 *
 * Reglas replicadas:
 *  - m² se calcula en base a ancho x alto en milímetros, convertidos a metros.
 *  - Los metros lineales de pulido dependen de cuántas caras de ancho/alto
 *    están marcadas como pulidas: cada cara de "ancho" pulida agrega un
 *    lado de longitud = ancho; cada cara de "alto" pulida agrega un lado
 *    de longitud = alto. Se multiplica por la cantidad de piezas.
 *  - La bonificación es un porcentaje aplicado sobre (vidrio + pulido).
 *  - Las observaciones de pulido se redactan automáticamente para la
 *    orden de corte, en vez de completarse a mano como en el Excel.
 */
export function computeSimpleGlassItem(input: SimpleGlassItemInput): SimpleGlassItemComputed {
  const anchoM = new Decimal(input.anchoMm).div(1000);
  const altoM = new Decimal(input.altoMm).div(1000);
  const cantidad = new Decimal(input.cantidad);

  const m2Unitario = anchoM.mul(altoM);
  const m2Total = m2Unitario.mul(cantidad);

  const metrosLinealesPulido = anchoM
    .mul(input.carasPulidasAncho)
    .plus(altoM.mul(input.carasPulidasAlto))
    .mul(cantidad);

  const subtotalVidrio = m2Total.mul(input.precioM2);
  const subtotalPulido = metrosLinealesPulido.mul(input.precioPulidoMl);

  const subtotalBruto = subtotalVidrio.plus(subtotalPulido);
  const montoBonificacion = subtotalBruto.mul(input.bonificacionPct).div(100);
  const subtotalNeto = subtotalBruto.minus(montoBonificacion);

  return {
    ...input,
    m2Unitario: round(m2Unitario),
    m2Total: round(m2Total),
    metrosLinealesPulido: round(metrosLinealesPulido),
    subtotalVidrio: round(subtotalVidrio),
    subtotalPulido: round(subtotalPulido),
    subtotalBruto: round(subtotalBruto),
    montoBonificacion: round(montoBonificacion),
    subtotalNeto: round(subtotalNeto),
    observacionesPulido: buildPulidoObservation(input.carasPulidasAncho, input.carasPulidasAlto),
  };
}

export function buildPulidoObservation(carasAncho: 0 | 1 | 2, carasAlto: 0 | 1 | 2): string {
  const total = carasAncho + carasAlto;
  if (total === 0) return "Sin pulido";
  const partes: string[] = [];
  if (carasAncho > 0) partes.push(`${carasAncho} cara${carasAncho > 1 ? "s" : ""} de ancho`);
  if (carasAlto > 0) partes.push(`${carasAlto} cara${carasAlto > 1 ? "s" : ""} de alto`);
  return `Pulido perimetral: ${partes.join(" + ")} (${total} cara${total > 1 ? "s" : ""} en total)`;
}

export function computeSimpleGlassQuote(
  items: SimpleGlassItemInput[],
  ivaRate: number = IVA_RATE
): { items: SimpleGlassItemComputed[]; totals: SimpleGlassQuoteTotals } {
  const computed = items.map(computeSimpleGlassItem);

  const cantidadTotalVidrios = computed.reduce((acc, i) => acc + i.cantidad, 0);
  const m2Total = round(computed.reduce((acc, i) => new Decimal(acc).plus(i.m2Total), new Decimal(0)));
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
      cantidadTotalVidrios,
      m2Total,
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

