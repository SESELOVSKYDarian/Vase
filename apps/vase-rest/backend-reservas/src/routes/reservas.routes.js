import { Router } from "express";
import {
  crearReserva,
  obtenerReservas,
  obtenerReservaPorId,
  cancelarReserva
} from "../controllers/reservas.controller.js";

const router = Router();

router.post("/", crearReserva);
router.get("/", obtenerReservas);
router.get("/:id", obtenerReservaPorId);
router.patch("/:id/cancelar", cancelarReserva);

export default router;