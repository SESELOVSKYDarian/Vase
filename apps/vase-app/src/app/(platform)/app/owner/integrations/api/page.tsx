import type { Route } from "next";
import { redirect } from "next/navigation";

// Esta pantalla ya no existe: la conexión con tu sistema de gestión está en Catálogo,
// en "¿De dónde sacás tus productos?". Los links viejos llegan ahí.
export default function IntegrationsApiPage() {
  redirect("/app/catalogo" as Route);
}
