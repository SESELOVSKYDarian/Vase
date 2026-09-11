export type QuoteStatus = "BORRADOR" | "ENVIADO" | "APROBADO" | "RECHAZADO" | "VENCIDO" | "ANULADO";
export type QuoteType = "SIMPLE" | "DVH";
export type WorkOrderStatus = "PENDIENTE" | "EN_PROCESO" | "TERMINADA" | "ANULADA";
export type DeliveryStatus = "SIN_ENTREGAR" | "ENTREGA_PARCIAL" | "ENTREGA_COMPLETA";
export type InvoiceStatus = "SIN_FACTURAR" | "FACTURADA_PARCIAL" | "FACTURADA";
export type TipoFacturacion = "A" | "N";
export type ArcaVoucherType = "FACTURA_A" | "FACTURA_B" | "FACTURA_C" | "NOTA_CREDITO_A" | "NOTA_CREDITO_B" | null;
export type PaymentMethod =
  | "EFECTIVO"
  | "TRANSFERENCIA"
  | "CHEQUE_FISICO"
  | "ECHEQ"
  | "CHEQUE_TERCEROS"
  | "DOLARES"
  | "OTRO";
export type PaymentApplicationTarget = "OT_ESPECIFICA" | "ACOPIO" | "CUENTA_CORRIENTE";
export type ProductCategory = "SIMPLE" | "DVH" | "TEMPLADO" | "PULIDO" | "SOLO_CORTE" | "DISTRIBUCION";
export type Role = "ADMIN" | "ADMINISTRACION" | "VENTAS" | "PRODUCCION" | "CORTE" | "ARMADO" | "DEPOSITO";

export interface Client {
  id: string;
  razonSocial: string;
  cuit: string;
  condicionIva: "RESPONSABLE_INSCRIPTO" | "MONOTRIBUTO" | "EXENTO" | "CONSUMIDOR_FINAL";
  domicilio: string;
  telefono: string;
  email: string;
  contacto: string;
  estado: "ACTIVO" | "INACTIVO";
  observaciones?: string;
  codigoCliente: string;
}

export interface Quote {
  id: string;
  numero: string;
  tipo: QuoteType;
  fecha: string;
  fechaEntrega: string;
  clienteId: string;
  obra: string;
  observaciones?: string;
  estado: QuoteStatus;
  tipoFacturacion: TipoFacturacion;
  cantidadTotal: number;
  m2Total: number;
  subtotalBruto: number;
  montoBonificacion: number;
  subtotalNeto: number;
  iva: number;
  total: number;
  workOrderId?: string;
}

export interface WorkOrder {
  id: string;
  numero: string;
  quoteId: string;
  clienteId: string;
  obra: string;
  tipo: QuoteType;
  categoria: ProductCategory;
  fechaCreacion: string;
  fechaEntrega: string;
  prioridad: "BAJA" | "MEDIA" | "ALTA" | "URGENTE";
  observaciones?: string;
  porcentajeAvance: number;
  estadoProductivo: WorkOrderStatus;
  estadoEntrega: DeliveryStatus;
  estadoFacturacion: InvoiceStatus;
  operario?: string;
  cantidadTotal: number;
  m2Total: number;
  cantidadEntregada: number;
}

export interface DeliveryNote {
  id: string;
  numero: string;
  workOrderId: string;
  clienteId: string;
  quoteId: string;
  fecha: string;
  direccion: string;
  transportista?: string;
  observaciones?: string;
  estado: "CONFIRMADO" | "ANULADO";
  items: { producto: string; cantidadPedida: number; cantidadEntregada: number }[];
}

export interface Invoice {
  id: string;
  numero: string;
  tipoFacturacion: TipoFacturacion;
  arcaVoucherType: ArcaVoucherType;
  clienteId: string;
  workOrderId: string;
  fecha: string;
  cuit: string;
  condicionIva: string;
  puntoVenta: number;
  moneda: "ARS" | "USD";
  subtotal: number;
  iva: number;
  tributos: number;
  total: number;
  cae: string | null;
  vencimientoCae: string | null;
  estadoArca: "NO_APLICA" | "PENDIENTE" | "AUTORIZADA" | "RECHAZADA" | "ERROR";
  estadoPago: "PENDIENTE" | "PARCIAL" | "PAGADA";
  montoCobrado: number;
}

export interface Payment {
  id: string;
  numero: string;
  fecha: string;
  clienteId: string;
  recibo: string;
  metodo: PaymentMethod;
  moneda: "ARS" | "USD";
  importe: number;
  montoUsd?: number;
  tipoCambio?: number;
  montoEquivalenteArs?: number;
  retencionMonto: number;
  observaciones?: string;
  allocations: { target: PaymentApplicationTarget; refId: string | null; refLabel: string; monto: number }[];
}

export interface AccountMovement {
  id: string;
  clienteId: string;
  fecha: string;
  tipo: "PRESUPUESTO" | "FACTURA" | "PAGO" | "RETENCION" | "AJUSTE";
  referencia: string;
  refId: string;
  debe: number;
  haber: number;
  saldo: number;
}

export interface PriceListItem {
  id: string;
  categoria: ProductCategory;
  producto: string;
  precioM2: number;
  precioMl?: number;
  vigenteDesde: string;
}

