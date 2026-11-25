// Manda un recordatorio de reunión: aviso en el panel de la cuenta + mail a cada persona de la cuenta.
import { notifyTenant } from "@/server/services/notices/notify-tenant";
import type { MeetingReminderKind } from "./reminder-windows";
import type { UpcomingMeeting } from "./upcoming-meetings";

const TIME_ZONE = "America/Argentina/Buenos_Aires";

/** "jueves, 27 de noviembre, 15:00" en hora de Argentina. */
export function formatMeetingDate(date: Date) {
  const day = new Intl.DateTimeFormat("es-AR", { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long" }).format(date);
  const time = new Intl.DateTimeFormat("es-AR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  return `${day}, ${time}`;
}

/** Título y texto del aviso según cuánto falta. */
export function meetingReminderText(meeting: UpcomingMeeting, kind: MeetingReminderKind) {
  const when = formatMeetingDate(meeting.startsAt);
  const title = kind === "MINUTES_30" ? "Tu reunión empieza en 30 minutos" : "Recordatorio: tenés una reunión con Vase";
  const lines = [
    kind === "MINUTES_30" ? `"${meeting.title}" empieza en 30 minutos (${when}).` : `Te recordamos la reunión "${meeting.title}": ${when}.`,
    meeting.url ? `Entrás desde este link: ${meeting.url}` : "El link para entrar lo vas a ver en Vase › Personalizaciones.",
  ];
  return { title, message: lines.join("\n"), when };
}

/** Avisa a la cuenta: notificación en el panel (dura hasta que empieza la reunión) y mail a cada miembro activo. */
export async function sendMeetingReminder(meeting: UpcomingMeeting, kind: MeetingReminderKind) {
  const { title, message, when } = meetingReminderText(meeting, kind);
  return notifyTenant({
    tenantId: meeting.tenantId,
    title,
    message,
    href: "/app/owner/customizations",
    tone: kind === "MINUTES_30" ? "warning" : "info",
    category: "meeting",
    endsAt: meeting.startsAt,
    emailExtras: {
      details: [["Reunión", meeting.title], ["Cuándo", `${when} (hora de Argentina)`]],
      ...(meeting.url ? { button: { label: "Entrar a la reunión", url: meeting.url } } : {}),
      reason: "Te llega porque tenés una reunión agendada con Vase.",
    },
  });
}
