// Tareas que la app hace sola, sin que nadie toque nada. Arranca desde instrumentation.ts (solo en producción).
import { runMeetingReminders } from "@/server/services/meeting-reminders";
import { runMonthlyReminders } from "@/server/services/monthly-reminders";
import { runTrialLifecycle } from "@/server/services/trial/trial-lifecycle";

const MINUTE = 60 * 1000;
const globalScheduler = globalThis as typeof globalThis & { __vaseSchedulerStarted?: boolean };

/** Corre una tarea y, si falla, deja el error en el registro sin frenar a las demás. */
async function runSafely(name: string, task: () => Promise<unknown>) {
  try {
    await task();
  } catch (error) {
    console.error(`[scheduler] ${name}`, error instanceof Error ? error.message : error);
  }
}

/** Cada hora: cobros mensuales y avisos de la prueba gratis. */
async function hourlyTick() {
  await runSafely("recordatorios mensuales", () => runMonthlyReminders());
  await runSafely("prueba gratis", () => runTrialLifecycle());
}

/** Cada 5 minutos: recordatorios de reuniones (el de 30 minutos antes necesita revisar seguido). */
async function frequentTick() {
  await runSafely("recordatorios de reuniones", () => runMeetingReminders());
}

/** Prende las tareas programadas. Cada tarea se encarga de no repetirse. */
export function startScheduler() {
  if (globalScheduler.__vaseSchedulerStarted) return;
  globalScheduler.__vaseSchedulerStarted = true;
  setTimeout(() => void hourlyTick(), 90 * 1000);
  setInterval(() => void hourlyTick(), 60 * MINUTE).unref?.();
  setTimeout(() => void frequentTick(), 2 * MINUTE);
  setInterval(() => void frequentTick(), 5 * MINUTE).unref?.();
  console.info("[scheduler] tareas programadas activas");
}
