/**
 * Tipos compartidos por los motores de cálculo de Vidrio Simple y DVH.
 * Estas interfaces son la traducción a TypeScript de los campos manuales
 * y calculados detectados en los Excel de origen (ver ANALISIS_FUNCIONAL.md).
 */

export interface SimpleGlassItemInput {
  id: string;
  producto: string;
  cantidad: number;
  anchoMm: number;
  altoMm: number;
  carasPulidasAncho: 0 | 1 | 2;
  carasPulidasAlto: 0 | 1 | 2;
  precioM2: number; // snapshot de PriceListItem al momento de crear el presupuesto
  precioPulidoMl: number; // snapshot
  bonificacionPct: number; // 0-100
}

export interface SimpleGlassItemComputed extends SimpleGlassItemInput {
  m2Unitario: number;
  m2Total: number;
  metrosLinealesPulido: number;
  subtotalVidrio: number;
  subtotalPulido: number;
  subtotalBruto: number;
  montoBonificacion: number;
  subtotalNeto: number;
  observacionesPulido: string;
}

export interface SimpleGlassQuoteTotals {
  cantidadTotalVidrios: number;
  m2Total: number;
  subtotalBruto: number;
  montoBonificacion: number;
  subtotalNeto: number;
  iva: number;
  total: number;
}

export type DvhCamara = "9mm" | "12mm" | "15mm" | "16mm";
export type DvhSeparador = "ALUMINIO" | "WARM_EDGE";
export type DvhSellado = "SIMPLE" | "DOBLE_SELLADO_ESTRUCTURAL";

export interface DvhGlassSpec {
  tipo: string; // ej: "Float 4mm", "Laminado 3+3", "Templado 6mm"
  espesorMm: number;
  precioM2: number; // snapshot
}

export interface DvhItemInput {
  id: string;
  composicion: string; // ej: "4/12/4", "Templado 6/16/Lam 3+3"
  vidrioExterior: DvhGlassSpec;
  vidrioInterior: DvhGlassSpec;
  camara: DvhCamara;
  separador: DvhSeparador;
  sellado: DvhSellado;
  cantidad: number;
  anchoMm: number;
  altoMm: number;
  precioSeparadorMl: number; // snapshot $/metro lineal
  precioSelladoMl: number; // snapshot $/metro lineal
  precioCamaraMl?: number; // snapshot $/metro lineal según cámara
  costoInsumosExtraUnitario: number; // gas argón, pinza, separador esquina, etc. snapshot
  costoManoObraM2?: number; // snapshot de mano de obra por m²
  margenPct: number; // margen comercial sobre costo
  bonificacionPct: number;
}

export interface DvhItemComputed extends DvhItemInput {
  espesorTotalMm: number;
  m2Unitario: number;
  m2Total: number;
  perimetroMl: number;
  costoVidrioExteriorUnitario: number;
  costoVidrioInteriorUnitario: number;
  costoSeparadorUnitario: number;
  costoSelladoUnitario: number;
  costoCamaraUnitario: number;
  costoManoObraUnitario: number;
  recargoTamanoPct: number;
  costoTotalUnitario: number;
  costoTotal: number;
  precioVentaUnitario: number;
  subtotalBruto: number;
  montoBonificacion: number;
  subtotalNeto: number;
}

export interface DvhQuoteTotals {
  cantidadTotalUnidades: number;
  m2Total: number;
  costoTotal: number;
  subtotalBruto: number;
  montoBonificacion: number;
  subtotalNeto: number;
  iva: number;
  total: number;
}

