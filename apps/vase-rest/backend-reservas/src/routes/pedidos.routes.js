import { Router } from "express";

import {
  abrirPedido,
  obtenerPedidos,
  obtenerPedidoPorId,
  agregarProductoAlPedido,
  cerrarPedido,
  cancelarPedido,
  actualizarEstado,
  actualizarComensales,
  eliminarPedido,
} from "../controllers/pedidos.controller.js";

const router = Router();

router.post("/", abrirPedido);
router.get("/", obtenerPedidos);
router.get("/:id", obtenerPedidoPorId);
router.post("/:id/productos", agregarProductoAlPedido);
router.patch("/:id/cerrar", cerrarPedido);
router.patch("/:id/cancelar", cancelarPedido);
router.patch("/:id/estado", actualizarEstado);
router.patch("/:id/comensales", actualizarComensales);
router.delete("/:id", eliminarPedido);

export default router;