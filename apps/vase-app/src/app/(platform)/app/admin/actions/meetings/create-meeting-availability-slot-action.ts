"use server";

// Parte de meetings.ts: enableCustomProjectMeetingAction, createMeetingAvailabilitySlotAction, updateMeetingAvailabilitySlotAction, deleteMeetingAvailabilitySlotAction, setCustomProjectMeetingLinkAction.
import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { sanitizeNullableText } from "@/lib/security/sanitize";
import { createMeetingAvailabilitySlotSchema, setCustomMeetingLinkSchema, updateMeetingAvailabilitySlotSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { AdminGovernanceActionState, CustomProjectMeetingTypeInput, customProjectMeetingTypes, parseBuenosAiresDateTimeLocal } from "../shared";

export async function enableCustomProjectMeetingAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
    const requestId = String(formData.get("requestId") ?? "");
    const meetingType = String(formData.get("meetingType") ?? "");
    if (!requestId || !meetingType) return { error: "Datos incompletos para habilitar la reunion." };
    if (!customProjectMeetingTypes.has(meetingType as CustomProjectMeetingTypeInput)) {
      return { error: "Tipo de reunion invalido." };
    }

    await prisma.customProjectMeeting.upsert({
      where: {
        customPageRequestId_type: {
          customPageRequestId: requestId,
          type: meetingType as CustomProjectMeetingTypeInput,
        },
      },
      update: {
        isEnabledByAdmin: true,
        status: "ENABLED",
      },
      create: {
        customPageRequestId: requestId,
        tenantId: String(formData.get("tenantId") ?? ""),
        type: meetingType as CustomProjectMeetingTypeInput,
        isEnabledByAdmin: true,
        status: "ENABLED",
      },
    });
    await createAuditLog({
      action: "platform.custom_project_meeting_enabled",
      targetType: "custom_project_meeting",
      actorUserId: adminSession.user.id,
    });
    revalidatePath("/app/admin/customizations");
    revalidatePath("/app/owner/customizations");
    return { success: "Reunion habilitada para el cliente." };
  } catch {
    return { error: "No pudimos habilitar la reunion." };
  }
}

export async function createMeetingAvailabilitySlotAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);

    const parsed = createMeetingAvailabilitySlotSchema.safeParse({
      tenantId: formData.get("tenantId"),
      startsAt: String(formData.get("startsAt") ?? ""),
      endsAt: String(formData.get("endsAt") ?? ""),
      durationMinutes: formData.get("durationMinutes"),
      capacity: formData.get("capacity"),
      notes: sanitizeNullableText(String(formData.get("notes") ?? "")) ?? undefined,
    });
    if (!parsed.success) return { error: "Datos de agenda invalidos." };

    const startsAt = parseBuenosAiresDateTimeLocal(parsed.data.startsAt);
    const endsAt = parseBuenosAiresDateTimeLocal(parsed.data.endsAt);

    if (endsAt <= startsAt) {
      return { error: "El horario de fin debe ser mayor al de inicio." };
    }

    const createdSlot = await prisma.meetingAvailabilitySlot.create({
      data: {
        tenantId: parsed.data.tenantId,
        startsAt,
        endsAt,
        durationMinutes: parsed.data.durationMinutes,
        capacity: parsed.data.capacity,
        notes: parsed.data.notes ?? null,
        createdByUserId: adminSession.user.id,
        updatedByUserId: adminSession.user.id,
      },
      include: {
        tenant: {
          select: {
            id: true,
            accountName: true,
          },
        },
      },
    });

    revalidatePath("/app/admin/customizations");
    return {
      success: "Slot de agenda creado.",
      createdSlot: {
        id: createdSlot.id,
        startsAt: createdSlot.startsAt.toISOString(),
        endsAt: createdSlot.endsAt.toISOString(),
        capacity: createdSlot.capacity,
        reservedCount: createdSlot.reservedCount,
        tenant: createdSlot.tenant,
      },
    };
  } catch {
    return { error: "No pudimos crear el slot." };
  }
}

export async function updateMeetingAvailabilitySlotAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
    const parsed = updateMeetingAvailabilitySlotSchema.safeParse({
      slotId: formData.get("slotId"),
      isActive:
        formData.get("isActive") == null
          ? undefined
          : String(formData.get("isActive")) === "true",
      startsAt: String(formData.get("startsAt") ?? ""),
      endsAt: String(formData.get("endsAt") ?? ""),
      durationMinutes: formData.get("durationMinutes"),
      capacity: formData.get("capacity"),
      notes: sanitizeNullableText(String(formData.get("notes") ?? "")) ?? undefined,
    });
    if (!parsed.success) return { error: "Datos de slot invalidos." };

    await prisma.meetingAvailabilitySlot.update({
      where: { id: parsed.data.slotId },
      data: {
        isActive: parsed.data.isActive,
        startsAt: parsed.data.startsAt ? parseBuenosAiresDateTimeLocal(parsed.data.startsAt) : undefined,
        endsAt: parsed.data.endsAt ? parseBuenosAiresDateTimeLocal(parsed.data.endsAt) : undefined,
        durationMinutes: parsed.data.durationMinutes,
        capacity: parsed.data.capacity,
        notes: parsed.data.notes ?? undefined,
        updatedByUserId: adminSession.user.id,
      },
    });
    revalidatePath("/app/admin/customizations");
    return { success: "Slot actualizado." };
  } catch {
    return { error: "No pudimos actualizar el slot." };
  }
}

export async function deleteMeetingAvailabilitySlotAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const adminSession = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
    const slotId = String(formData.get("slotId") ?? "");
    if (!slotId) return { error: "Falta el horario a eliminar." };

    const slot = await prisma.meetingAvailabilitySlot.findUnique({
      where: { id: slotId },
      select: {
        id: true,
        tenantId: true,
      },
    });

    if (!slot) {
      return { error: "Ese horario ya no existe." };
    }

    await prisma.meetingAvailabilitySlot.update({
      where: { id: slot.id },
      data: {
        isActive: false,
        updatedByUserId: adminSession.user.id,
      },
    });

    await createAuditLog({
      action: "platform.custom_project_slot_deleted",
      targetType: "meeting_availability_slot",
      targetId: slot.id,
      tenantId: slot.tenantId,
      actorUserId: adminSession.user.id,
    });

    revalidatePath("/app/admin/customizations");
    revalidatePath("/app/owner/customizations");
    return { success: "Horario eliminado.", deletedSlotId: slot.id };
  } catch {
    return { error: "No pudimos eliminar el horario." };
  }
}

export async function setCustomProjectMeetingLinkAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
    const parsed = setCustomMeetingLinkSchema.safeParse({
      requestId: formData.get("requestId"),
      meetingType: formData.get("meetingType"),
      meetingUrl: String(formData.get("meetingUrl") ?? ""),
    });
    if (!parsed.success) return { error: "Link de reunion invalido." };

    await prisma.customProjectMeeting.update({
      where: {
        customPageRequestId_type: {
          customPageRequestId: parsed.data.requestId,
          type: parsed.data.meetingType,
        },
      },
      data: {
        meetingUrl: parsed.data.meetingUrl,
      },
    });

    await prisma.customProjectMeetingBooking.updateMany({
      where: { customPageRequestId: parsed.data.requestId },
      data: { meetingUrl: parsed.data.meetingUrl },
    });

    revalidatePath("/app/admin/customizations");
    revalidatePath("/app/business");
    revalidatePath("/app");
    return { success: "Link de reunion actualizado." };
  } catch {
    return { error: "No pudimos actualizar el link de reunion." };
  }
}
