// lib/reports/schedule.ts
// Único lugar donde se calcula nextRunAt para SavedReportSchedule — antes
// había una copia de esta lógica en cada endpoint que crea un schedule,
// y una de ellas (app/api/ia/reportes/route.ts) directamente se olvidaba
// de setear nextRunAt, dejando el reporte "guardado" pero nunca ejecutado
// por el cron de app/api/reportes/procesar-programados.

export function computeNextRun(schedule: {
  frequency: string
  dayOfWeek?: number | null
  dayOfMonth?: number | null
  time?: string | null
}): Date {
  const now = new Date()
  const [h, m] = (schedule.time ?? '08:00').split(':').map(Number)
  const next = new Date(now)
  next.setHours(h, m, 0, 0)
  if (next <= now) next.setDate(next.getDate() + 1)

  if (schedule.frequency === 'WEEKLY' && schedule.dayOfWeek !== null && schedule.dayOfWeek !== undefined) {
    while (next.getDay() !== schedule.dayOfWeek) next.setDate(next.getDate() + 1)
  }
  if (schedule.frequency === 'MONTHLY' && schedule.dayOfMonth) {
    next.setDate(schedule.dayOfMonth)
    if (next <= now) next.setMonth(next.getMonth() + 1)
  }
  return next
}
