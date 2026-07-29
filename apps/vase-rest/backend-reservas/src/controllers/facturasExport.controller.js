import { supabaseAdmin } from "../config/supabaseAdmin.js";
import { generarExcelFacturas } from "../services/excel.service.js";
import { rechazarSinPermisoFacturacion } from "../utils/authz.js";

const EXPORT_LIMIT = 5000;
const FACTURAS_SELECT = `
  *,
  pagos(*)
`;

class ExportacionFacturasError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.name = "ExportacionFacturasError";
    this.statusCode = statusCode;
    Object.assign(this, details);
  }
}

function money(value) {
  return Number(Number(value || 0).toFixed(2));
}

function isMissingClienteSchema(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("clientes") ||
    message.includes("cliente_id") ||
    message.includes("relationship between 'facturas' and 'clientes'")
  );
}

function isMissingPagosRelationship(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("relationship") && message.includes("facturas") && message.includes("pagos");
}

function mapCliente(cliente) {
  if (!cliente) return null;
  return {
    id: cliente.id,
    nombre: cliente.nombre,
    documento: cliente.documento,
    condicionFiscal: cliente.condicion_fiscal,
  };
}

function mapPago(pago) {
  if (!pago) return null;
  return {
    id: pago.id,
    metodoPago: pago.metodo_pago,
    estado: pago.estado,
    confirmadoEn: pago.confirmado_en,
  };
}

function mapFacturaExport(factura) {
  return {
    id: factura.id,
    numeroComprobante: factura.numero_comprobante,
    tipoComprobante: Number(factura.tipo_comprobante || factura.tipo_cbte || 6),
    creadoEn: factura.creado_en || factura.creada_en,
    cliente: mapCliente(factura.cliente || factura.clientes),
    subtotal: money(factura.subtotal),
    impuestos: money(factura.impuestos),
    descuento: money(factura.descuento),
    total: money(factura.total),
    metodoPago: factura.metodo_pago,
    estado: factura.estado,
    cae: factura.cae,
    vencimientoCae: factura.vencimiento_cae,
    puntoVenta: factura.punto_venta,
    saldoPendiente: money(factura.saldo_pendiente),
    pago: mapPago(factura.pagos),
  };
}

function aplicarFiltros(query, queryParams = {}) {
  const { desde, hasta, estado, tipoComprobante, metodoPago } = queryParams;

  if (desde) query = query.gte("creado_en", `${desde}T00:00:00.000Z`);
  if (hasta) query = query.lte("creado_en", `${hasta}T23:59:59.999Z`);
  if (estado) query = query.eq("estado", estado);
  if (tipoComprobante) query = query.eq("tipo_comprobante", Number(tipoComprobante));
  if (metodoPago) query = query.eq("metodo_pago", metodoPago);

  return query;
}

async function idsClientesPorBusqueda(texto) {
  if (!texto) return null;

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .select("id")
    .or(`nombre.ilike.%${texto}%,documento.ilike.%${texto}%`)
    .limit(200);

  if (error) {
    if (isMissingClienteSchema(error)) {
      throw new ExportacionFacturasError(
        "El filtro por cliente requiere aplicar el esquema de clientes de facturacion.",
        400,
        { code: error.code, queryDetails: "clientes.select(id).or(nombre/documento)" }
      );
    }
    throw new Error(error.message);
  }

  return (data || []).map((cliente) => cliente.id);
}

async function hidratarClientes(facturas) {
  const clienteIds = [...new Set(
    facturas
      .map((factura) => factura.cliente_id)
      .filter(Boolean)
  )];

  if (clienteIds.length === 0) return facturas;

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .select("id, nombre, documento, condicion_fiscal")
    .in("id", clienteIds);

  if (error) {
    if (isMissingClienteSchema(error)) return facturas;
    throw new Error(error.message);
  }

  const clientesPorId = new Map((data || []).map((cliente) => [cliente.id, cliente]));
  return facturas.map((factura) => ({
    ...factura,
    cliente: clientesPorId.get(factura.cliente_id) || null,
  }));
}

async function consultarFacturas({ queryParams, limit, incluirPagos = true }) {
  const select = incluirPagos ? FACTURAS_SELECT : "*";
  let query = supabaseAdmin
    .from("facturas")
    .select(select)
    .order("creado_en", { ascending: false })
    .limit(limit);

  query = aplicarFiltros(query, queryParams);

  if (queryParams.clienteId) query = query.eq("cliente_id", queryParams.clienteId);
  if (queryParams.cliente && !queryParams.clienteId) {
    const ids = await idsClientesPorBusqueda(queryParams.cliente);
    if (ids && ids.length === 0) return [];
    if (ids && ids.length > 0) query = query.in("cliente_id", ids);
  }

  const { data, error } = await query;
  if (!error) return data || [];

  if (incluirPagos && isMissingPagosRelationship(error)) {
    return consultarFacturas({ queryParams, limit, incluirPagos: false });
  }

  if ((queryParams.clienteId || queryParams.cliente) && isMissingClienteSchema(error)) {
    throw new ExportacionFacturasError(
      "El filtro por cliente requiere aplicar el esquema de clientes de facturacion.",
      400,
      { code: error.code, queryDetails: "facturas.select + filtro cliente_id" }
    );
  }

  throw new ExportacionFacturasError(error.message, 500, {
    code: error.code,
    queryDetails: `facturas.select(${select.replace(/\s+/g, " ").trim()})`,
  });
}

export async function obtenerFacturasFiltradas(queryParams = {}, limit = 200) {
  const facturas = await consultarFacturas({ queryParams, limit });
  const facturasConClientes = await hidratarClientes(facturas);
  return facturasConClientes.map(mapFacturaExport);
}

function logExportError(error, req) {
  if (process.env.NODE_ENV === "production") return;

  console.error("[facturas/exportar] Error al generar Excel", {
    name: error.name,
    message: error.message,
    code: error.code,
    stack: error.stack,
    query: error.queryDetails || "facturas export",
    filters: {
      desde: req.query.desde,
      hasta: req.query.hasta,
      cliente: req.query.cliente ? "[presente]" : undefined,
      clienteId: req.query.clienteId ? "[presente]" : undefined,
      estado: req.query.estado,
      tipoComprobante: req.query.tipoComprobante,
      metodoPago: req.query.metodoPago,
    },
  });
}

export const exportarFacturas = async (req, res) => {
  if (rechazarSinPermisoFacturacion(req, res)) return;

  try {
    const facturas = await obtenerFacturasFiltradas(req.query, EXPORT_LIMIT);
    const excel = await generarExcelFacturas({
      facturas,
      filtros: {
        desde: req.query.desde,
        hasta: req.query.hasta,
      },
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${excel.filename}"`);
    return res.send(Buffer.from(excel.buffer));
  } catch (error) {
    logExportError(error, req);

    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      mensaje: statusCode === 500
        ? "No se pudo generar la exportacion de facturas"
        : error.message,
      error: statusCode === 500
        ? "No se pudo generar la exportacion de facturas"
        : error.message,
    });
  }
};
