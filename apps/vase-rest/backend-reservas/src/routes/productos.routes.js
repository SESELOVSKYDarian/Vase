import { Router } from "express";

import {
  crearProducto,
  obtenerProductos,
  obtenerProductoPorId,
  actualizarProducto,
  eliminarProducto,
  cambiarDisponibilidadProducto
} from "../controllers/productos.controller.js";

const router = Router();

router.post("/", crearProducto);
router.get("/", obtenerProductos);
router.get("/:id", obtenerProductoPorId);
router.put("/:id", actualizarProducto);
router.delete("/:id", eliminarProducto);
router.patch("/:id/disponibilidad", cambiarDisponibilidadProducto);

export default router;