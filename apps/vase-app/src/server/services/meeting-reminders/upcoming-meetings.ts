// Junta las reuniones de las próximas 24 horas, vengan de donde vengan.
import { prisma } from "@/lib/db/prisma";

export type UpcomingMeeting = {
  /** Identificador estable de la reunión (origen + id). */
  key: string;
  tenantId: string;
  title: string;
  startsAt: Date;
  url: string | null;
};

/**
 * Reuniones con fecha entre ahora y dentro de 24 horas:
 * - las de la agenda (las crea el admin en el panel o las pide el cliente y quedan confirmadas);
 * - las reservas de proyectos personalizados que todavía no tienen su reunión en la agenda.
 */
export async function findUpcomingMeetings(now: Date): Promise<UpcomingMeeting[]> {
  const until = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const [agenda, bookings] = await Promise.all([
    prisma.meetingV2.findMany({
      where: { scheduledAt: { gt: now, lte: until } },
      select: { id: true, tenantId: true, title: true, scheduledAt: true, meetUrl: true, sourceCustomMeetingId: true },
    }),
    prisma.customProjectMeetingBooking.findMany({
      where: { status: "SCHEDULED", scheduledStart: { gt: now, lte: until } },
      select: { id: true, tenantId: true, scheduledStart: true, meetingUrl: true, customMeetingId: true, customMeeting: { select: { meetingUrl: true } } },
    }),
  ]);

  const inAgenda = new Set(agenda.map((meeting) => meeting.sourceCustomMeetingId).filter(Boolean));
  const fromAgenda = agenda.flatMap((meeting) =>
    meeting.scheduledAt
      ? [{ key: `agenda:${meeting.id}`, tenantId: meeting.tenantId, title: meeting.title, startsAt: meeting.scheduledAt, url: meeting.meetUrl }]
      : [],
  );
  const fromBookings = bookings
    .filter((booking) => !booking.customMeetingId || !inAgenda.has(booking.customMeetingId))
    .map((booking) => ({
      key: `reserva:${booking.id}`,
      tenantId: booking.tenantId,
      title: "Reunión de tu proyecto personalizado",
      startsAt: booking.scheduledStart,
      url: booking.meetingUrl ?? booking.customMeeting?.meetingUrl ?? null,
    }));

  return [...fromAgenda, ...fromBookings];
}
