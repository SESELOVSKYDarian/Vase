// Recordatorios de reuniones: el día anterior y 30 minutos antes.
// Lo corre el programador de tareas de la app (server/scheduler.ts) cada 5 minutos.
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/server/services/audit-log";
import { dueMeetingReminders, meetingReminderKey } from "./reminder-windows";
import { sendMeetingReminder } from "./send-meeting-reminder";
import { findUpcomingMeetings } from "./upcoming-meetings";

const SENT_ACTION = "meeting.reminder_sent";

/** ¿Ya salió este aviso? Busca solo en los últimos 2 días para que la consulta sea liviana. */
async function alreadySent(tenantId: string, key: string, now: Date) {
  const found = await prisma.auditLog.findFirst({
    where: { tenantId, action: SENT_ACTION, targetId: key, createdAt: { gte: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) } },
    select: { id: true },
  });
  return Boolean(found);
}

/** Revisa las reuniones de las próximas 24 horas y manda los avisos que tocan, una sola vez cada uno. */
export async function runMeetingReminders(now = new Date()) {
  const meetings = await findUpcomingMeetings(now);
  for (const meeting of meetings) {
    for (const kind of dueMeetingReminders(meeting.startsAt, now)) {
      const key = meetingReminderKey(meeting.key, kind, meeting.startsAt);
      if (await alreadySent(meeting.tenantId, key, now)) continue;
      // Se registra antes de mandar: si algo falla a mitad, no se repite.
      await createAuditLog({ action: SENT_ACTION, targetType: "meeting", targetId: key, tenantId: meeting.tenantId, metadata: { kind } });
      const emails = await sendMeetingReminder(meeting, kind);
      console.info(`[meeting-reminders:sent] ${key} emails=${emails}`);
    }
  }
}
