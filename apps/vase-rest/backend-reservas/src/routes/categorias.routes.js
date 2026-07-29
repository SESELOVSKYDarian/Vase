import { Router } from "express";
import {
  obtenerCategorias,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
} from "../controllers/categorias.controller.js";

const router = Router();

router.get("/", obtenerCategorias);
router.post("/", crearCategoria);
router.put("/:id", actualizarCategoria);
router.delete("/:id", eliminarCategoria);

export default router;
