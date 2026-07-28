import { supabaseAdmin } from "../config/supabaseAdmin.js";

const MONEDA_DEFAULT = "ARS";
const ESTADOS_FACTURA_PENDIENTE = new Set([
  "pendiente",
  "emitida",
  "parcial",
  "parcialmente_pagada",
]);

function money(value) {
  return Number(Number(value || 0).toFixed(2));
}

function asNullableText(value) {
  const text = String(value || "").trim();
  return text || null;
}

// Servicios de cuenta corriente para saldos, pagos y ajustes por cliente.
export function mapCliente(cliente) {
  if (!cliente) return null;

  return {
    id: cliente.id,
    nombre: cliente.nombre,
    documento: cliente.documento,
    condicionFiscal: cliente.condicion_fiscal,
    email: cliente.email,
    telefono: cliente.telefono,
    creadoEn: cliente.creado_en,
    actualizadoEn: cliente.actualizado_en,
  };
}

export function mapMovimientoCuentaCorriente(movimiento) {
  if (!movimiento) return null;

  return {
    id: movimiento.id,
    cuentaCorrienteId: movimiento.cuenta_corriente_id,
    clienteId: movimiento.cliente_id,
    tipo: movimiento.tipo,
    origen: movimiento.origen,
    importe: money(movimiento.importe),
    moneda: movimiento.moneda || MONEDA_DEFAULT,
    fecha: movimiento.fecha,
    descripcion: movimiento.descripcion,
    facturaId: movimiento.factura_id,
    pagoCuentaCorrienteId: movimiento.pago_cuenta_corriente_id,
    movimientoRevertidoId: movimiento.movimiento_revertido_id,
    creadoPor: movimiento.creado_por,
    restauranteId: movimiento.restaurante_id,
    idempotencyKey: movimiento.idempotency_key,
    creadoEn: movimiento.creado_en,
  };
}

export function calcularSaldoMovimientos(movimientos = []) {
  return money(
    movimientos.reduce((saldo, movimiento) => {
      const importe = Number(movimiento.importe || 0);
      return movimiento.tipo === "DEBIT" ? saldo + importe : saldo - importe;
    }, 0)
  );
}

function acumularTotales(movimientos = []) {
  return movimientos.reduce(
    (acc, movimiento) => {
      if (movimiento.tipo === "DEBIT") acc.totalDebitado += Number(movimiento.importe || 0);
      if (movimiento.tipo === "CREDIT") acc.totalAcreditado += Number(movimiento.importe || 0);
      return acc;
    },
    { totalDebitado: 0, totalAcreditado: 0 }
  );
}

export async function obtenerClientePorId(clienteId) {
  const { data, error } = await supabaseAdmin
    .from("clientes")
    .select("*")
    .eq("id", clienteId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Cliente no encontrado");
  }

  return data;
}

/**
 * Reutiliza un cliente existente o crea uno para facturar a cuenta corriente.
 */
export async function obtenerOCrearCliente(input = {}) {
  const clienteId = asNullableText(input.clienteId || input.id);
  if (clienteId) return obtenerClientePorId(clienteId);

  const documento = asNullableText(input.documento);
  if (documento) {
    const { data: existente, error: existeError } = await supabaseAdmin
      .from("clientes")
      .select("*")
      .eq("documento", documento)
      .maybeSingle();

    if (existeError) throw new Error(existeError.message);
    if (existente) return existente;
  }

  const nombre = asNullableText(input.nombre);
  if (!nombre) {
    throw new Error("El cliente es obligatorio para cuenta corriente");
  }

  const { data, error } = await supabaseAdmin
    .from("clientes")
    .insert({
      nombre,
      documento,
      condicion_fiscal: asNullableText(input.condicionFiscal),
      email: asNullableText(input.email),
      telefono: asNullableText(input.telefono),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function obtenerOCrearCuentaCorriente(clienteId) {
  const { data: existente, error: existeError } = await supabaseAdmin
    .from("cuentas_corrientes")
    .select("*")
    .eq("cliente_id", clienteId)
    .maybeSingle();

  if (existeError) throw new Error(existeError.message);
  if (existente) return existente;

  const { data, error } = await supabaseAdmin
    .from("cuentas_corrientes")
    .insert({ cliente_id: clienteId, estado: "activa" })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function buscarMovimientoPorCampo(campo, valor, origen) {
  if (!valor) return null;

  let query = supabaseAdmin
    .from("movimientos_cuenta_corriente")
    .select("*")
    .eq(campo, valor);

  if (origen) query = query.eq("origen", origen);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function buscarMovimientoPorIdempotency(idempotencyKey) {
  return buscarMovimientoPorCampo("idempotency_key", asNullableText(idempotencyKey));
}

/**
 * Registra debitos y creditos idempotentes en la cuenta corriente.
 */
export async function crearMovimientoCuentaCorriente({
  clienteId,
  tipo,
  origen,
  importe,
  descripcion,
  fecha,
  facturaId,
  pagoCuentaCorrienteId,
  movimientoRevertidoId,
  creadoPor,
  idempotencyKey,
}) {
  const importeNumero = money(importe);
  if (importeNumero <= 0) throw new Error("El importe debe ser mayor a cero");
  if (!clienteId) throw new Error("El cliente es obligatorio");
  if (!["DEBIT", "CREDIT"].includes(tipo)) throw new Error("Tipo de movimiento invalido");

  if (idempotencyKey) {
    const existente = await buscarMovimientoPorIdempotency(idempotencyKey);
    if (existente) return existente;
  }

  if (origen === "INVOICE" && facturaId) {
    const existente = await buscarMovimientoPorCampo("factura_id", facturaId, "INVOICE");
    if (existente) return existente;
  }

  if (origen === "PAYMENT" && pagoCuentaCorrienteId) {
    const existente = await buscarMovimientoPorCampo(
      "pago_cuenta_corriente_id",
      pagoCuentaCorrienteId,
      "PAYMENT"
    );
    if (existente) return existente;
  }

  const cuenta = await obtenerOCrearCuentaCorriente(clienteId);
  const { data, error } = await supabaseAdmin
    .from("movimientos_cuenta_corriente")
    .insert({
      cuenta_corriente_id: cuenta.id,
      cliente_id: clienteId,
      tipo,
      origen,
      importe: importeNumero,
      moneda: MONEDA_DEFAULT,
      fecha: fecha || new Date().toISOString(),
      descripcion,
      factura_id: facturaId || null,
      pago_cuenta_corriente_id: pagoCuentaCorrienteId || null,
      movimiento_revertido_id: movimientoRevertidoId || null,
      creado_por: asNullableText(creadoPor),
      idempotency_key: asNullableText(idempotencyKey),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function crearDebitoFacturaCuentaCorriente({
  clienteId,
  factura,
  creadoPor,
  idempotencyKey,
}) {
  return crearMovimientoCuentaCorriente({
    clienteId,
    tipo: "DEBIT",
    origen: "INVOICE",
    importe: factura.total,
    descripcion: `Factura ${factura.numero_comprobante || factura.id}`,
    facturaId: factura.id,
    creadoPor,
    idempotencyKey: idempotencyKey || `factura:${factura.id}:debito`,
  });
}

export async function obtenerResumenCuentasCorrientes() {
  const { data: cuentas, error: cuentasError } = await supabaseAdmin
    .from("cuentas_corrientes")
    .select("*, clientes(*)")
    .order("actualizado_en", { ascending: false });

  if (cuentasError) throw new Error(cuentasError.message);

  const clienteIds = (cuentas || []).map((cuenta) => cuenta.cliente_id);
  if (clienteIds.length === 0) return [];

  const [{ data: movimientos, error: movimientosError }, { data: facturas, error: facturasError }] =
    await Promise.all([
      supabaseAdmin
        .from("movimientos_cuenta_corriente")
        .select("*")
        .in("cliente_id", clienteIds)
        .order("fecha", { ascending: true }),
      supabaseAdmin
        .from("facturas")
        .select("id, cliente_id, estado, total, saldo_pendiente, creado_en")
        .in("cliente_id", clienteIds),
    ]);

  if (movimientosError) throw new Error(movimientosError.message);
  if (facturasError) throw new Error(facturasError.message);

  return (cuentas || []).map((cuenta) => {
    const movimientosCliente = (movimientos || []).filter((mov) => mov.cliente_id === cuenta.cliente_id);
    const facturasCliente = (facturas || []).filter((factura) => factura.cliente_id === cuenta.cliente_id);
    const ultimoMovimiento = movimientosCliente[movimientosCliente.length - 1] || null;
    const pendientes = facturasCliente.filter((factura) => {
      const saldoPendiente = Number(factura.saldo_pendiente || 0);
      return saldoPendiente > 0 || ESTADOS_FACTURA_PENDIENTE.has(factura.estado);
    });

    return {
      cuentaCorrienteId: cuenta.id,
      cliente: mapCliente(cuenta.clientes),
      estado: cuenta.estado,
      saldo: calcularSaldoMovimientos(movimientosCliente),
      cantidadFacturasPendientes: pendientes.length,
      deudaVencida: 0,
      ultimoMovimiento: mapMovimientoCuentaCorriente(ultimoMovimiento),
      creadoEn: cuenta.creado_en,
      actualizadoEn: cuenta.actualizado_en,
    };
  });
}

export async function obtenerDetalleCuentaCorriente(clienteId) {
  const cliente = await obtenerClientePorId(clienteId);
  const cuenta = await obtenerOCrearCuentaCorriente(clienteId);

  const [{ data: movimientos, error: movimientosError }, { data: facturas, error: facturasError }] =
    await Promise.all([
      supabaseAdmin
        .from("movimientos_cuenta_corriente")
        .select("*")
        .eq("cliente_id", clienteId)
        .order("fecha", { ascending: true })
        .order("creado_en", { ascending: true }),
      supabaseAdmin
        .from("facturas")
        .select("id, numero_comprobante, tipo_comprobante, estado, total, saldo_pendiente, creado_en")
        .eq("cliente_id", clienteId)
        .order("creado_en", { ascending: false }),
    ]);

  if (movimientosError) throw new Error(movimientosError.message);
  if (facturasError) throw new Error(facturasError.message);

  const totales = acumularTotales(movimientos || []);
  const facturasPendientes = (facturas || []).filter((factura) => {
    const saldoPendiente = Number(factura.saldo_pendiente || 0);
    return saldoPendiente > 0 || ESTADOS_FACTURA_PENDIENTE.has(factura.estado);
  });

  return {
    cuenta: {
      id: cuenta.id,
      estado: cuenta.estado,
      creadoEn: cuenta.creado_en,
      actualizadoEn: cuenta.actualizado_en,
    },
    cliente: mapCliente(cliente),
    saldo: calcularSaldoMovimientos(movimientos || []),
    totalDebitado: money(totales.totalDebitado),
    totalAcreditado: money(totales.totalAcreditado),
    facturasPendientes: facturasPendientes.map((factura) => ({
      id: factura.id,
      numeroComprobante: factura.numero_comprobante,
      tipoComprobante: factura.tipo_comprobante,
      estado: factura.estado,
      total: money(factura.total),
      saldoPendiente: money(factura.saldo_pendiente),
      creadoEn: factura.creado_en,
    })),
    movimientos: (movimientos || []).map(mapMovimientoCuentaCorriente),
  };
}

/**
 * Guarda un pago de cliente y acredita el saldo de cuenta corriente.
 */
export async function registrarPagoCuentaCorriente({
  clienteId,
  importe,
  medioPago,
  referencia,
  observaciones,
  fechaPago,
  creadoPor,
  idempotencyKey,
}) {
  const importeNumero = money(importe);
  if (!clienteId) throw new Error("El cliente es obligatorio");
  if (importeNumero <= 0) throw new Error("El importe debe ser mayor a cero");
  if (!asNullableText(medioPago)) throw new Error("El medio de pago es obligatorio");

  if (idempotencyKey) {
    const { data: pagoExistente, error: pagoExistenteError } = await supabaseAdmin
      .from("pagos_cuenta_corriente")
      .select("*")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (pagoExistenteError) throw new Error(pagoExistenteError.message);
    if (pagoExistente) return pagoExistente;
  }

  const cuenta = await obtenerOCrearCuentaCorriente(clienteId);
  const { data: pago, error } = await supabaseAdmin
    .from("pagos_cuenta_corriente")
    .insert({
      cliente_id: clienteId,
      cuenta_corriente_id: cuenta.id,
      importe: importeNumero,
      moneda: MONEDA_DEFAULT,
      medio_pago: medioPago,
      referencia: asNullableText(referencia),
      observaciones: asNullableText(observaciones),
      fecha_pago: fechaPago || new Date().toISOString(),
      creado_por: asNullableText(creadoPor),
      idempotency_key: asNullableText(idempotencyKey),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await crearMovimientoCuentaCorriente({
    clienteId,
    tipo: "CREDIT",
    origen: "PAYMENT",
    importe: importeNumero,
    descripcion: observaciones || `Pago cuenta corriente (${medioPago})`,
    fecha: pago.fecha_pago,
    pagoCuentaCorrienteId: pago.id,
    creadoPor,
    idempotencyKey: idempotencyKey ? `${idempotencyKey}:movimiento` : `pago:${pago.id}:credito`,
  });

  return pago;
}

export async function registrarAjusteCuentaCorriente({
  clienteId,
  tipo,
  importe,
  motivo,
  creadoPor,
  idempotencyKey,
}) {
  if (!asNullableText(motivo)) throw new Error("El motivo del ajuste es obligatorio");

  return crearMovimientoCuentaCorriente({
    clienteId,
    tipo,
    origen: "MANUAL_ADJUSTMENT",
    importe,
    descripcion: motivo,
    creadoPor,
    idempotencyKey,
  });
}

/**
 * Crea el movimiento inverso sin borrar el historial original.
 */
export async function revertirMovimientoCuentaCorriente({
  movimientoId,
  motivo,
  creadoPor,
  idempotencyKey,
}) {
  if (!asNullableText(motivo)) throw new Error("El motivo de la reversion es obligatorio");

  const { data: movimiento, error } = await supabaseAdmin
    .from("movimientos_cuenta_corriente")
    .select("*")
    .eq("id", movimientoId)
    .single();

  if (error || !movimiento) throw new Error(error?.message || "Movimiento no encontrado");

  const existente = await buscarMovimientoPorCampo(
    "movimiento_revertido_id",
    movimientoId,
    "REVERSAL"
  );
  if (existente) return existente;

  return crearMovimientoCuentaCorriente({
    clienteId: movimiento.cliente_id,
    tipo: movimiento.tipo === "DEBIT" ? "CREDIT" : "DEBIT",
    origen: "REVERSAL",
    importe: movimiento.importe,
    descripcion: motivo,
    movimientoRevertidoId: movimiento.id,
    creadoPor,
    idempotencyKey: idempotencyKey || `reversion:${movimiento.id}`,
  });
}
