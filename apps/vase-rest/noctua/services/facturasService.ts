import { useAuthStore } from '@/store/authStore';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export type MetodoPagoFactura =
  | 'efectivo'
  | 'billetera_virtual'
  | 'debito'
  | 'credito'
  | 'cuenta_corriente';

export type MotivoPagoInternoNoFiscal =
  | 'prueba_interna'
  | 'cortesia_autorizada'
  | 'consumo_interno'
  | 'ajuste_de_caja'
  | 'error_operativo'
  | 'otro';

export type TipoComprobante = 1 | 6 | 11;

export type ClienteFactura = {
  id: string;
  nombre: string;
  documento?: string | null;
  condicionFiscal?: string | null;
  email?: string | null;
  telefono?: string | null;
};

export type ClienteFacturaInput = {
  clienteId?: string;
  nombre?: string;
  documento?: string;
  condicionFiscal?: string;
  email?: string;
  telefono?: string;
};

export type PedidoFacturaItem = {
  id: string;
  productoId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  notas?: string | null;
  producto?: {
    id: string;
    nombre: string;
    precio: number;
  } | null;
};

export type PedidoListoFactura = {
  id: string;
  mesaId: string;
  estado: string;
  subtotal: number;
  impuestos: number;
  total: number;
  mesa?: {
    id: string;
    numero: number;
    zona?: string;
    capacidad?: number;
  } | null;
  items: PedidoFacturaItem[];
};

export type MovimientoCajaNoFiscal = {
  id: string;
  pedidoId?: string | null;
  mesaId?: string | null;
  tipo: string;
  metodo: string;
  importe: number;
  motivo: MotivoPagoInternoNoFiscal | string;
  observacion?: string | null;
  creadoPor?: string | null;
  creadoEn?: string;
  pedido?: {
    id: string;
    total?: number;
    estado?: string | null;
  } | null;
  mesa?: {
    id: string;
    numero?: number | null;
    zona?: string | null;
  } | null;
};

export type Factura = {
  id: string;
  pedidoId: string;
  pagoId: string;
  mesaId: string;
  clienteId?: string | null;
  numeroComprobante: string;
  tipoComprobante: number;
  metodoPago: MetodoPagoFactura;
  subtotal: number;
  impuestos: number;
  descuento?: number;
  total: number;
  saldoPendiente?: number;
  estado: string;
  cae?: string | null;
  vencimientoCae?: string | null;
  qrFiscal?: string | null;
  arcaEstado?: string | null;
  arcaError?: string | null;
  creadoEn?: string;
  cliente?: ClienteFactura | null;
};

export type Pago = {
  id: string;
  pedidoId: string;
  mesaId: string;
  clienteId?: string | null;
  metodoPago: MetodoPagoFactura;
  tipoComprobante: number;
  monto: number;
  estado: string;
  temporal?: boolean;
  recibidoPor?: string | null;
  montoRecibido?: number;
  vuelto?: number;
};

export type MovimientoCuentaCorriente = {
  id: string;
  cuentaCorrienteId: string;
  clienteId: string;
  tipo: 'DEBIT' | 'CREDIT';
  origen: 'INVOICE' | 'PAYMENT' | 'CREDIT_NOTE' | 'REVERSAL' | 'MANUAL_ADJUSTMENT';
  importe: number;
  moneda: string;
  fecha: string;
  descripcion: string;
  facturaId?: string | null;
  pagoCuentaCorrienteId?: string | null;
  movimientoRevertidoId?: string | null;
  creadoPor?: string | null;
  creadoEn?: string;
};

export type CuentaCorrienteResumen = {
  cuentaCorrienteId: string;
  cliente: ClienteFactura;
  estado: string;
  saldo: number;
  cantidadFacturasPendientes: number;
  deudaVencida: number;
  ultimoMovimiento?: MovimientoCuentaCorriente | null;
  creadoEn?: string;
  actualizadoEn?: string;
};

export type FacturaPendienteCuenta = {
  id: string;
  numeroComprobante?: string | null;
  tipoComprobante?: number | null;
  estado: string;
  total: number;
  saldoPendiente: number;
  creadoEn?: string;
};

export type CuentaCorrienteDetalle = {
  cuenta: {
    id: string;
    estado: string;
    creadoEn?: string;
    actualizadoEn?: string;
  };
  cliente: ClienteFactura;
  saldo: number;
  totalDebitado: number;
  totalAcreditado: number;
  facturasPendientes: FacturaPendienteCuenta[];
  movimientos: MovimientoCuentaCorriente[];
};

export type FacturasFiltros = {
  desde?: string;
  hasta?: string;
  cliente?: string;
  clienteId?: string;
  estado?: string;
  tipoComprobante?: string;
  metodoPago?: string;
};

export type CobrarPedidoPayload = {
  pedidoId: string;
  metodoPago: MetodoPagoFactura;
  tipoComprobante: TipoComprobante;
  tipoTarjeta?: string;
  marcaTarjeta?: string;
  bancoTarjeta?: string;
  proveedorBilletera?: string;
  referenciaPago?: string;
  recibidoPor?: string;
  montoRecibido?: number;
  vuelto?: number;
  cliente?: ClienteFacturaInput;
  idempotencyKey?: string;
};

export type PagoInternoNoFiscalPayload = {
  pedidoId: string;
  motivo: MotivoPagoInternoNoFiscal;
  observacion?: string;
  recibidoPor: string;
  montoRecibido: number;
};

export type MovimientosCajaFiltros = {
  desde?: string;
  hasta?: string;
  tipo?: string;
  pedidoId?: string;
};

type ApiRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ApiRecord {
  return typeof value === 'object' && value !== null;
}

/**
 * Envia rol y usuario para que el backend aplique permisos.
 */
function getAuthHeaders(): Record<string, string> {
  const usuario = useAuthStore.getState().usuario;
  if (!usuario) return {};

  return {
    'X-Noctua-Role': usuario.rol,
    'X-Noctua-User': usuario.nombre,
  };
}

function esUuid(valor: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(valor || '')
  );
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `?${text}` : '';
}

function getMessage(data: unknown) {
  if (!isRecord(data)) return 'Error inesperado';

  const mensaje = data.mensaje;
  const message = data.message;
  const error = data.error;

  if (typeof mensaje === 'string') return mensaje;
  if (typeof message === 'string') return message;
  if (typeof error === 'string') return error;

  return 'Error inesperado';
}

async function readResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { mensaje: text };
  }
}

async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...((options.headers || {}) as Record<string, string>),
    },
  });

  const data = await readResponse(response);

  if (!response.ok) {
    throw new Error(getMessage(data));
  }

  return data as T;
}

function filenameFromDisposition(disposition: string | null, fallback: string) {
  if (!disposition) return fallback;
  const match = disposition.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i);
  return match?.[1] ? decodeURIComponent(match[1].replaceAll('"', '')) : fallback;
}

async function download(endpoint: string, fallbackFilename: string) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const data = await readResponse(response);
    throw new Error(getMessage(data));
  }

  const blob = await response.blob();
  return {
    blob,
    filename: filenameFromDisposition(response.headers.get('Content-Disposition'), fallbackFilename),
  };
}

export const facturasService = {
  async verificarARCA() {
    return apiFetch<{
      mensaje: string;
      arca: {
        ok: boolean;
        mensaje: string;
        modo?: string;
        cuit?: string;
        puntoVenta?: number;
      };
    }>('/facturas/arca/verificar');
  },

  /**
   * Carga pedidos reales listos para facturar y descarta IDs no UUID.
   */
  async obtenerPedidosListos(): Promise<PedidoListoFactura[]> {
    const response = await apiFetch<{
      mensaje: string;
      total: number;
      pedidos: PedidoListoFactura[];
    }>('/facturas/pedidos/listos');

    return Array.isArray(response.pedidos)
      ? response.pedidos.filter((pedido) => esUuid(pedido.id))
      : [];
  },

  async cobrarPedido(payload: CobrarPedidoPayload) {
    return apiFetch<{
      mensaje: string;
      arca?: unknown;
      pago: Pago;
      factura?: Factura;
      cliente?: ClienteFactura | null;
      movimiento?: MovimientoCuentaCorriente | null;
      pedido?: PedidoListoFactura;
      requiereConfirmacion: boolean;
    }>(`/facturas/pedido/${payload.pedidoId}/cobrar`, {
      method: 'POST',
      body: JSON.stringify({
        metodoPago: payload.metodoPago,
        tipoComprobante: payload.tipoComprobante,
        tipoTarjeta: payload.tipoTarjeta,
        marcaTarjeta: payload.marcaTarjeta,
        bancoTarjeta: payload.bancoTarjeta,
        proveedorBilletera: payload.proveedorBilletera,
        referenciaPago: payload.referenciaPago,
        recibidoPor: payload.recibidoPor,
        montoRecibido: payload.montoRecibido,
        vuelto: payload.vuelto,
        cliente: payload.cliente,
        idempotencyKey: payload.idempotencyKey,
      }),
    });
  },

  /**
   * Movimiento interno no fiscal: no llama a ARCA, no genera factura ni CAE.
   */
  async registrarPagoInternoNoFiscal(payload: PagoInternoNoFiscalPayload) {
    if (!esUuid(payload.pedidoId)) {
      throw new Error(
        'ID de pedido invalido. Recarga los pedidos desde la base de datos antes de registrar el movimiento interno.'
      );
    }

    return apiFetch<{
      mensaje: string;
      pedidoId: string;
      pedidoCerrado: boolean;
      mesaLiberada: boolean;
      movimiento: MovimientoCajaNoFiscal;
      noFiscal: true;
      idempotente?: boolean;
    }>(`/facturas/pedido/${payload.pedidoId}/pago-interno`, {
      method: 'POST',
      body: JSON.stringify({
        pedidoId: payload.pedidoId,
        motivo: payload.motivo,
        observacion: payload.observacion,
        recibidoPor: payload.recibidoPor,
        montoRecibido: payload.montoRecibido,
      }),
    });
  },

  async confirmarPagoEfectivo(params: {
    pagoId: string;
    recibidoPor?: string;
    montoRecibido?: number;
    vuelto?: number;
  }) {
    return apiFetch<{
      mensaje: string;
      pago: Pago;
      factura: Factura;
    }>(`/facturas/pago/${params.pagoId}/confirmar-efectivo`, {
      method: 'POST',
      body: JSON.stringify({
        recibidoPor: params.recibidoPor,
        montoRecibido: params.montoRecibido,
        vuelto: params.vuelto,
      }),
    });
  },

  async obtenerFacturas(filtros: FacturasFiltros = {}): Promise<Factura[]> {
    const response = await apiFetch<{
      mensaje: string;
      total: number;
      facturas: Factura[];
    }>(`/facturas${buildQuery({ ...filtros, limit: 50 })}`);

    return Array.isArray(response.facturas) ? response.facturas : [];
  },

  async exportarFacturas(filtros: FacturasFiltros = {}) {
    return download(`/facturas/exportar${buildQuery(filtros)}`, 'facturas.xlsx');
  },

  /**
   * Lista movimientos internos separados de la exportacion fiscal.
   */
  async obtenerMovimientosCaja(filtros: MovimientosCajaFiltros = {}): Promise<MovimientoCajaNoFiscal[]> {
    const response = await apiFetch<{
      mensaje: string;
      total: number;
      movimientos: MovimientoCajaNoFiscal[];
    }>(`/facturas/movimientos-caja${buildQuery({ ...filtros, limit: 50 })}`);

    return Array.isArray(response.movimientos) ? response.movimientos : [];
  },

  async exportarMovimientosCaja(filtros: MovimientosCajaFiltros = {}) {
    return download(
      `/facturas/movimientos-caja/exportar${buildQuery(filtros)}`,
      'movimientos_caja_no_fiscal.xlsx'
    );
  },

  async obtenerCuentasCorrientes(): Promise<CuentaCorrienteResumen[]> {
    const response = await apiFetch<{
      mensaje: string;
      total: number;
      cuentas: CuentaCorrienteResumen[];
    }>('/facturas/cuentas-corrientes');

    return Array.isArray(response.cuentas) ? response.cuentas : [];
  },

  async obtenerCuentaCorriente(clienteId: string): Promise<CuentaCorrienteDetalle> {
    return apiFetch<CuentaCorrienteDetalle & { mensaje: string }>(`/facturas/cuentas-corrientes/${clienteId}`);
  },

  async registrarPagoCuentaCorriente(params: {
    clienteId: string;
    importe: number;
    medioPago: string;
    referencia?: string;
    observaciones?: string;
    fechaPago?: string;
    idempotencyKey: string;
  }): Promise<CuentaCorrienteDetalle> {
    return apiFetch<CuentaCorrienteDetalle & { mensaje: string }>(`/facturas/cuentas-corrientes/${params.clienteId}/pagos`, {
      method: 'POST',
      body: JSON.stringify({
        importe: params.importe,
        medioPago: params.medioPago,
        referencia: params.referencia,
        observaciones: params.observaciones,
        fechaPago: params.fechaPago,
        idempotencyKey: params.idempotencyKey,
      }),
    });
  },

  async registrarAjusteCuentaCorriente(params: {
    clienteId: string;
    tipo: 'DEBIT' | 'CREDIT';
    importe: number;
    motivo: string;
    idempotencyKey: string;
  }) {
    return apiFetch<{ mensaje: string; movimiento: MovimientoCuentaCorriente }>(`/facturas/cuentas-corrientes/${params.clienteId}/ajustes`, {
      method: 'POST',
      body: JSON.stringify({
        tipo: params.tipo,
        importe: params.importe,
        motivo: params.motivo,
        idempotencyKey: params.idempotencyKey,
      }),
    });
  },

  async exportarCuentaCorriente(clienteId: string) {
    return download(`/facturas/cuentas-corrientes/${clienteId}/exportar`, `cuenta_corriente_${clienteId}.xlsx`);
  },
};
