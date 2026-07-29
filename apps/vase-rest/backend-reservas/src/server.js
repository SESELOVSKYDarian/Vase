import { env } from "./config/env.js";
import app from "./app.js";

const PORT = env.port;

// Inicia Express usando el puerto validado por configuracion.
const server = app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `El puerto ${PORT} ya esta siendo utilizado. Cierra la instancia anterior del servidor.`
    );
    process.exit(1);
  }

  throw error;
});
