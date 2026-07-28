import { Router } from "express";

import {
  verificarARCAController,
  obtenerPedidosListosParaCobrar,
  cobrarPedido,
  confirmarPagoEfectivo,
  registrarPagoInternoNoFiscal,
  obtenerMovimientosCaja,
  exportarMovimientosCaja,
  obtenerFacturas,
  obtenerFacturaPorId,
} from "../controllers/facturas.controller.js";
import {
  exportarCuentaCorriente,
  listarCuentasCorrientes,
  obtenerCuentaCorriente,
  registrarAjusteCliente,
  registrarPagoCliente,
  revertirMovimientoCliente,
} from "../controllers/cuentasCorrientes.controller.js";
import { exportarFacturas } from "../controllers/facturasExport.controller.js";

const router = Router();

// Rutas de facturacion fiscal y consultas auxiliares de caja.
router.get("/arca/verificar", verificarARCAController);
router.get("/pedidos/listos", obtenerPedidosListosParaCobrar);

// Movimiento interno no fiscal: no llama a ARCA, no crea factura y no genera CAE.
router.post("/pedido/:pedidoId/pago-interno", registrarPagoInternoNoFiscal);
router.post("/:pedidoId/pago-interno", registrarPagoInternoNoFiscal);
router.post("/pedido/:pedidoId/cobrar", cobrarPedido);
router.post("/:pedidoId/cobrar", cobrarPedido);

router.post("/pago/:pagoId/confirmar-efectivo", confirmarPagoEfectivo);

router.get("/exportar", exportarFacturas);
router.get("/movimientos-caja/exportar", exportarMovimientosCaja);
router.get("/movimientos-caja", obtenerMovimientosCaja);
// Cuenta corriente mantiene saldos de clientes separados de movimientos internos.
router.get("/cuentas-corrientes", listarCuentasCorrientes);
router.get("/cuentas-corrientes/:clienteId/exportar", exportarCuentaCorriente);
router.get("/cuentas-corrientes/:clienteId", obtenerCuentaCorriente);
router.post("/cuentas-corrientes/:clienteId/pagos", registrarPagoCliente);
router.post("/cuentas-corrientes/:clienteId/ajustes", registrarAjusteCliente);
router.post("/cuentas-corrientes/movimientos/:movimientoId/revertir", revertirMovimientoCliente);

router.get("/", obtenerFacturas);
router.get("/:id", obtenerFacturaPorId);

export default router;
