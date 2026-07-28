import {
  mapMovimientoCuentaCorriente,
  obtenerDetalleCuentaCorriente,
  obtenerResumenCuentasCorrientes,
  registrarAjusteCuentaCorriente,
  registrarPagoCuentaCorriente,
  revertirMovimientoCuentaCorriente,
} from "../services/cuentaCorriente.service.js";
import { generarExcelCuentaCorriente } from "../services/excel.service.js";
import {
  obtenerUsuarioRequest,
  rechazarSinPermisoFacturacion,
} from "../utils/authz.js";

// Controlador HTTP de cuenta corriente; delega reglas de saldo al servicio.
function enviarExcel(res, { buffer, filename }) {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send(Buffer.from(buffer));
}

export const listarCuentasCorrientes = async (req, res) => {
  if (rechazarSinPermisoFacturacion(req, res)) return;

  try {
    const cuentas = await obtenerResumenCuentasCorrientes();
    return res.json({
      mensaje: "Cuentas corrientes obtenidas correctamente",
      total: cuentas.length,
      cuentas,
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al obtener cuentas corrientes",
      error: error.message,
    });
  }
};

export const obtenerCuentaCorriente = async (req, res) => {
  if (rechazarSinPermisoFacturacion(req, res)) return;

  try {
    const detalle = await obtenerDetalleCuentaCorriente(req.params.clienteId);
    return res.json({
      mensaje: "Cuenta corriente obtenida correctamente",
      ...detalle,
    });
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al obtener cuenta corriente",
      error: error.message,
    });
  }
};

/**
 * Registra pagos que acreditan la cuenta corriente del cliente.
 */
export const registrarPagoCliente = async (req, res) => {
  if (rechazarSinPermisoFacturacion(req, res)) return;

  try {
    const usuario = obtenerUsuarioRequest(req);
    const pago = await registrarPagoCuentaCorriente({
      clienteId: req.params.clienteId,
      importe: req.body.importe,
      medioPago: req.body.medioPago,
      referencia: req.body.referencia,
      observaciones: req.body.observaciones,
      fechaPago: req.body.fechaPago,
      creadoPor: req.body.creadoPor || usuario.nombre || usuario.rol,
      idempotencyKey: req.body.idempotencyKey,
    });

    const detalle = await obtenerDetalleCuentaCorriente(req.params.clienteId);
    return res.status(201).json({
      mensaje: "Pago registrado correctamente",
      pago,
      ...detalle,
    });
  } catch (error) {
    return res.status(400).json({
      mensaje: "Error al registrar pago",
      error: error.message,
    });
  }
};

export const registrarAjusteCliente = async (req, res) => {
  if (rechazarSinPermisoFacturacion(req, res)) return;

  try {
    const usuario = obtenerUsuarioRequest(req);
    const movimiento = await registrarAjusteCuentaCorriente({
      clienteId: req.params.clienteId,
      tipo: req.body.tipo,
      importe: req.body.importe,
      motivo: req.body.motivo,
      creadoPor: req.body.creadoPor || usuario.nombre || usuario.rol,
      idempotencyKey: req.body.idempotencyKey,
    });

    return res.status(201).json({
      mensaje: "Ajuste registrado correctamente",
      movimiento: mapMovimientoCuentaCorriente(movimiento),
    });
  } catch (error) {
    return res.status(400).json({
      mensaje: "Error al registrar ajuste",
      error: error.message,
    });
  }
};

export const revertirMovimientoCliente = async (req, res) => {
  if (rechazarSinPermisoFacturacion(req, res)) return;

  try {
    const usuario = obtenerUsuarioRequest(req);
    const movimiento = await revertirMovimientoCuentaCorriente({
      movimientoId: req.params.movimientoId,
      motivo: req.body.motivo,
      creadoPor: req.body.creadoPor || usuario.nombre || usuario.rol,
      idempotencyKey: req.body.idempotencyKey,
    });

    return res.status(201).json({
      mensaje: "Movimiento revertido correctamente",
      movimiento: mapMovimientoCuentaCorriente(movimiento),
    });
  } catch (error) {
    return res.status(400).json({
      mensaje: "Error al revertir movimiento",
      error: error.message,
    });
  }
};

/**
 * Descarga el detalle de cuenta corriente en Excel.
 */
export const exportarCuentaCorriente = async (req, res) => {
  if (rechazarSinPermisoFacturacion(req, res)) return;

  try {
    const detalle = await obtenerDetalleCuentaCorriente(req.params.clienteId);
    const excel = await generarExcelCuentaCorriente(detalle);
    return enviarExcel(res, excel);
  } catch (error) {
    return res.status(500).json({
      mensaje: "Error al exportar cuenta corriente",
      error: error.message,
    });
  }
};
