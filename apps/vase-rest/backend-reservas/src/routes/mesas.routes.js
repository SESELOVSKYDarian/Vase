import express from "express";

import {
  crearMesa,
  eliminarMesa,
  obtenerMesas,
  obtenerMesasDisponibles,
  obtenerEstadoMesas,
} from "../controllers/mesas.controller.js";

const router = express.Router();

router.get("/", obtenerMesas);
router.get("/estado", obtenerEstadoMesas);
router.get("/disponibles", obtenerMesasDisponibles);

router.post("/", crearMesa);

router.delete("/:id", eliminarMesa);

export default router;