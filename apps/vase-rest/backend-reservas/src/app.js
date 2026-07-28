import express from "express";
import cors from "cors";

import mesasRoutes from "./routes/mesas.routes.js";
import reservasRoutes from "./routes/reservas.routes.js";
import productosRoutes from "./routes/productos.routes.js";
import pedidosRoutes from "./routes/pedidos.routes.js";
import facturasRoutes from "./routes/facturas.routes.js";
import usuariosRoutes from "./routes/usuarios.routes.js";
import categoriasRoutes from "./routes/categorias.routes.js";

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // Permite cualquier origen localhost en desarrollo
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

app.use(express.json());

// Monta los modulos principales de NOCTUA bajo /api.
app.use("/api/mesas", mesasRoutes);
app.use("/api/reservas", reservasRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/pedidos", pedidosRoutes);
app.use("/api/facturas", facturasRoutes);
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/categorias", categoriasRoutes);

export default app;
