// Cuándo sale cada recordatorio de una reunión. Sin base de datos: se puede probar solo.

export type MeetingReminderKind = "DAY_BEFORE" | "MINUTES_30";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/**
 * Qué recordatorios tocan ahora para una reunión que empieza en `startsAt`.
 * - DAY_BEFORE: entre 24 horas y 2 horas antes (si se agenda con menos de 2 horas, solo va el de 30 minutos).
 * - MINUTES_30: en los últimos 30 minutos antes de empezar.
 * Después de que empezó, ya no sale nada.
 */
export function dueMeetingReminders(startsAt: Date, now: Date): MeetingReminderKind[] {
  const left = startsAt.getTime() - now.getTime();
  if (left <= 0) return [];
  const due: MeetingReminderKind[] = [];
  if (left <= 24 * HOUR && left > 2 * HOUR) due.push("DAY_BEFORE");
  if (left <= 30 * MINUTE) due.push("MINUTES_30");
  return due;
}

/**
 * Clave única de un aviso. Lleva la hora de la reunión: si la cambian de horario,
 * la clave cambia y el recordatorio vuelve a salir para la hora nueva.
 */
export function meetingReminderKey(meetingKey: string, kind: MeetingReminderKind, startsAt: Date) {
  return `${meetingKey}:${kind}:${startsAt.toISOString()}`;
}
