import { prisma } from "@/lib/db/prisma";
import { sendNoticeEmail } from "@/server/services/auth-email";

function withinWindow(target: Date, now: Date, minutes: number) {
  const delta = target.getTime() - now.getTime();
  return delta <= minutes * 60 * 1000 && delta >= 0;
}

export async function runCustomProjectMeetingReminders() {
  const now = new Date();
  const soon = new Date(now.getTime() + 31 * 60 * 1000);

  const bookings = await prisma.customProjectMeetingBooking.findMany({
    where: {
      status: "SCHEDULED",
      scheduledStart: {
        gte: now,
        lte: soon,
      },
    },
    include: {
      customMeeting: {
        select: { meetingUrl: true },
      },
    },
  });

  for (const booking of bookings) {
    const tMinus30 = withinWindow(booking.scheduledStart, now, 30);
    const atStart = Math.abs(booking.scheduledStart.getTime() - now.getTime()) <= 60 * 1000;

    if (tMinus30 && !booking.reminder30SentAt) {
      await prisma.$transaction(async (tx) => {
        await tx.customProjectMeetingNotificationLog.create({
          data: {
            bookingId: booking.id,
            kind: "T_MINUS_30",
            channel: "PANEL",
          },
        });
        await tx.customProjectMeetingBooking.update({
          where: { id: booking.id },
          data: { reminder30SentAt: now },
        });
        await tx.adminNotification.create({
          data: {
            target: "TENANT",
            tenantId: booking.tenantId,
            title: "Recordatorio: reunion en 30 minutos",
            message: "Tu reunion de proyecto personalizado comienza en 30 minutos.",
            tone: "info",
            isActive: true,
          },
        });
      });
    }

    if (atStart && !booking.startSentAt) {
      const meetingUrl = booking.meetingUrl ?? booking.customMeeting?.meetingUrl ?? null;
      const bookedByUser = booking.bookedByUserId
        ? await prisma.user.findUnique({
            where: { id: booking.bookedByUserId },
            select: { email: true, name: true },
          })
        : null;
      await prisma.$transaction(async (tx) => {
        await tx.customProjectMeetingNotificationLog.createMany({
          data: [
            {
              bookingId: booking.id,
              kind: "START_TIME",
              channel: "PANEL",
            },
            {
              bookingId: booking.id,
              kind: "START_TIME",
              channel: "EMAIL",
            },
          ],
        });
        await tx.customProjectMeetingBooking.update({
          where: { id: booking.id },
          data: { startSentAt: now },
        });
        await tx.adminNotification.create({
          data: {
            target: "TENANT",
            tenantId: booking.tenantId,
            title: "Tu reunion comienza ahora",
            message: meetingUrl
              ? `Ya puedes ingresar a la reunion: ${meetingUrl}`
              : "Tu reunion comienza ahora. El equipo compartira el enlace en breve.",
            tone: "info",
            isActive: true,
          },
        });
      });

      if (bookedByUser?.email) {
        await sendNoticeEmail({
          email: bookedByUser.email,
          subject: "Vase: tu reunion comienza ahora",
          message: meetingUrl
            ? `Hola ${bookedByUser.name ?? ""}, tu reunion ya comenzo. Link: ${meetingUrl}`
            : `Hola ${bookedByUser.name ?? ""}, tu reunion ya comenzo.`,
        });
      }
    }
  }
}
