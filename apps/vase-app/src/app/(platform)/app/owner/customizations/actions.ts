"use server";

import { revalidatePath } from "next/cache";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { sanitizeText } from "@/lib/security/sanitize";
import { createAuditLog } from "@/server/services/audit-log";

export type ScheduleMeetingResult = { ok: boolean; message?: string };

const TOPIC_MIN = 3;
const TOPIC_MAX = 160;

/** Agenda una reunión nueva o mueve una existente a otro horario publicado por Vase. */
export async function scheduleClientMeetingAction(input: {
  topic: string;
  slotId: string;
  replace?: { kind: "v2" | "booking"; id: string } | null;
}): Promise<ScheduleMeetingResult> {
  try {
    const { session, membership } = await requireTenantRole(tenantRoles.MANAGER);
    const tenantId = membership.tenantId;
    const topic = sanitizeText(String(input.topic ?? "")).trim().slice(0, TOPIC_MAX);
    if (!input.replace && topic.length < TOPIC_MIN) return { ok: false, message: "Contanos de qué querés hablar." };

    const capacity = prisma.meetingAvailabilitySlot.fields.capacity;
    const meetingId = await prisma.$transaction(async (tx) => {
      const reserved = await tx.meetingAvailabilitySlot.updateMany({
        where: {
          id: input.slotId,
          tenantId,
          isActive: true,
          endsAt: { gte: new Date() },
          reservedCount: { lt: capacity },
        },
        data: { reservedCount: { increment: 1 } },
      });
      if (reserved.count !== 1) throw new Error("SLOT_TAKEN");
      const slot = await tx.meetingAvailabilitySlot.findUniqueOrThrow({ where: { id: input.slotId } });

      if (input.replace?.kind === "booking") {
        const booking = await tx.customProjectMeetingBooking.findFirst({
          where: { id: input.replace.id, tenantId, status: "SCHEDULED" },
          select: { id: true, slotId: true, customMeetingId: true },
        });
        if (!booking) throw new Error("MEETING_NOT_FOUND");
        await tx.meetingAvailabilitySlot.updateMany({
          where: { id: booking.slotId, tenantId, reservedCount: { gt: 0 } },
          data: { reservedCount: { decrement: 1 } },
        });
        await tx.customProjectMeetingBooking.update({
          where: { id: booking.id },
          data: {
            slotId: slot.id,
            scheduledStart: slot.startsAt,
            scheduledEnd: slot.endsAt,
            reminder30SentAt: null,
            startSentAt: null,
          },
        });
        if (booking.customMeetingId) {
          await tx.meetingV2.updateMany({
            where: { tenantId, sourceCustomMeetingId: booking.customMeetingId },
            data: { scheduledAt: slot.startsAt },
          });
        }
        return booking.id;
      }

      if (input.replace?.kind === "v2") {
        const meeting = await tx.meetingV2.findFirst({
          where: { id: input.replace.id, tenantId },
          select: { id: true, scheduledAt: true },
        });
        if (!meeting) throw new Error("MEETING_NOT_FOUND");
        if (meeting.scheduledAt) {
          await tx.meetingAvailabilitySlot.updateMany({
            where: { tenantId, startsAt: meeting.scheduledAt, id: { not: slot.id }, reservedCount: { gt: 0 } },
            data: { reservedCount: { decrement: 1 } },
          });
        }
        await tx.meetingV2.update({ where: { id: meeting.id }, data: { scheduledAt: slot.startsAt } });
        return meeting.id;
      }

      const created = await tx.meetingV2.create({
        data: {
          tenantId,
          title: topic,
          category: "Pedido del cliente",
          scheduledAt: slot.startsAt,
          description: `Pedida por ${session.user.name ?? session.user.email ?? "el cliente"}`,
        },
        select: { id: true },
      });
      return created.id;
    });

    await createAuditLog({
      action: input.replace ? "meeting.rescheduled_by_client" : "meeting.scheduled_by_client",
      targetType: "meeting",
      targetId: meetingId,
      tenantId,
      actorUserId: session.user.id,
    });
    revalidatePath("/app/owner/customizations");
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_TAKEN") {
      return { ok: false, message: "Ese horario ya no está disponible. Elegí otro." };
    }
    return { ok: false, message: "No pudimos agendar la reunión. Probá de nuevo." };
  }
}
