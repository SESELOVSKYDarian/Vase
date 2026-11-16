import type { Route } from "next";
import { redirect } from "next/navigation";

// Esta pantalla ya no existe: la conexión con tu sistema de gestión está en Ajustes › Mi negocio,
// en "Cómo se conectan tus productos". Los links viejos llegan ahí.
export default function IntegrationsApiPage() {
  redirect("/app/settings?tab=negocio" as Route);
}
