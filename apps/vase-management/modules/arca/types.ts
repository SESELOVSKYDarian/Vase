/**
 * Tipos del módulo ARCA. Independientes del Web Service concreto
 * (WSFEv1 / WSMTXCA) para que la lógica comercial nunca dependa
 * directamente de la implementación elegida.
 */

export type ArcaEnvironment = "HOMOLOGACION" | "PRODUCCION";

export type ArcaVoucherType =
  | "FACTURA_A"
  | "FACTURA_B"
  | "FACTURA_C"
  | "NOTA_CREDITO_A"
  | "NOTA_CREDITO_B"
  | "NOTA_DEBITO_A"
  | "NOTA_DEBITO_B"
  | "NOTA_CREDITO_C" | "NOTA_DEBITO_C"
  | "FACTURA_M" | "NOTA_CREDITO_M" | "NOTA_DEBITO_M"
  | "FCE_FACTURA_A" | "FCE_NOTA_DEBITO_A" | "FCE_NOTA_CREDITO_A"
  | "FCE_FACTURA_B" | "FCE_NOTA_DEBITO_B" | "FCE_NOTA_CREDITO_B"
  | "FCE_FACTURA_C" | "FCE_NOTA_DEBITO_C" | "FCE_NOTA_CREDITO_C";

export interface ArcaInvoiceRequest {
  /** Idempotency key estable: ej. `invoice:{invoiceId}`. Nunca debe repetirse una autorización para la misma key. */
  idempotencyKey: string;
  environment: ArcaEnvironment;
  puntoVenta: number;
  voucherType: ArcaVoucherType;
  cuitEmisor: string;
  clienteDocTipo: string;
  clienteDocCode?: number;
  clienteDocNumero: string;
  condicionIvaReceptor: string;
  fecha: string; // ISO
  importeNeto: number;
  importeIva: number;
  importeTributos: number;
  importeTotal: number;
  moneda: "PES" | "DOL";
  cotizacionMoneda: number;
  conceptos: "PRODUCTOS" | "SERVICIOS" | "PRODUCTOS_Y_SERVICIOS";
  ivaId?: number;
  associatedVoucher?: { voucherType: ArcaVoucherType; puntoVenta: number; numero: number; cuit?: string; fecha?: string };
}

export interface ArcaInvoiceResult {
  ok: boolean;
  cae: string | null;
  vencimientoCae: string | null;
  numeroComprobante: number | null;
  estado: "AUTORIZADA" | "RECHAZADA" | "ERROR";
  errores: { codigo: string; mensaje: string }[];
  observaciones: { codigo: string; mensaje: string }[];
  requestRaw: unknown;
  responseRaw: unknown;
}

export interface ArcaLastVoucherInfo {
  puntoVenta: number;
  voucherType: ArcaVoucherType;
  ultimoNumeroAutorizado: number;
}

/**
 * Abstracción que desacopla la lógica comercial (facturación) del
 * Web Service de ARCA elegido. Cualquier implementación (WSFEv1 real,
 * WSMTXCA real, o un mock de homologación) debe cumplir este contrato.
 *
 * Reglas que toda implementación DEBE respetar:
 *  - Nunca marcar una factura como AUTORIZADA si ARCA no confirmó la autorización.
 *  - Ser idempotente: una misma idempotencyKey nunca debe generar dos autorizaciones.
 *  - No exponer certificados/claves privadas fuera del backend.
 */
export interface ArcaInvoiceProvider {
  getEnvironment(): ArcaEnvironment;
  getLastAuthorizedVoucher(puntoVenta: number, voucherType: ArcaVoucherType): Promise<ArcaLastVoucherInfo>;
  authorizeInvoice(request: ArcaInvoiceRequest): Promise<ArcaInvoiceResult>;
}

