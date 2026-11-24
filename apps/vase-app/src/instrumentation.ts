// Se ejecuta una vez al arrancar el servidor. Prende las tareas programadas (solo en Node y en producción).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production" || process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.DISABLE_SCHEDULER === "true") return;
  const { startScheduler } = await import("./server/scheduler");
  startScheduler();
}
