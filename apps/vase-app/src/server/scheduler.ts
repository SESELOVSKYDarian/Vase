import { runMonthlyReminders } from "@/server/services/monthly-reminders";

const HOUR = 60 * 60 * 1000;
const globalScheduler = globalThis as typeof globalThis & { __vaseSchedulerStarted?: boolean };

async function tick() {
  try {
    await runMonthlyReminders();
  } catch (error) {
    console.error("[scheduler] recordatorios mensuales", error instanceof Error ? error.message : error);
  }
}

/** Revisa una vez por hora si hay tareas para hacer. Cada tarea se encarga de no repetirse. */
export function startScheduler() {
  if (globalScheduler.__vaseSchedulerStarted) return;
  globalScheduler.__vaseSchedulerStarted = true;
  setTimeout(() => void tick(), 90 * 1000);
  setInterval(() => void tick(), HOUR).unref?.();
  console.info("[scheduler] tareas programadas activas");
}
