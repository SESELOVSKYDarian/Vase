"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { createAuditLog } from "@/server/services/audit-log";

export type AdminMeetingsActionState = {
  success?: string;
  error?: string;
};

const createMeetingSchema = z.object({
  tenantId: z.string().trim().cuid(),
  title: z.string().trim().min(3).max(140),
  category: z.string().trim().min(2).max(60),
  meetUrl: z.string().trim().url().optional().or(z.literal("")),
  scheduledAt: z.string().trim().optional(),
  description: z.string().trim().max(1000).optional(),
});

const updateMeetingSchema = z.object({
  meetingId: z.string().trim().cuid(),
  title: z.string().trim().min(3).max(140),
  category: z.string().trim().min(2).max(60),
  meetUrl: z.string().trim().url().optional().or(z.literal("")),
  scheduledAt: z.string().trim().optional(),
  description: z.string().trim().max(1000).optional(),
});

const deleteMeetingSchema = z.object({
  meetingId: z.string().trim().cuid(),
});

const addMeetingTaskSchema = z.object({
  meetingId: z.string().trim().cuid(),
  title: z.string().trim().min(3).max(180),
  dueDate: z.string().trim().optional(),
  responsibleUserId: z.string().trim().cuid().optional().or(z.literal("")),
});

const addMeetingDecisionSchema = z.object({
  meetingId: z.string().trim().cuid(),
  description: z.string().trim().min(3).max(1500),
});

function toNullableDate(value?: string) {
  if (!value?.trim()) return null;
  return new Date(value);
}

export async function createMeetingV2WithStateAction(
  _: AdminMeetingsActionState,
  formData: FormData,
): Promise<AdminMeetingsActionState> {
  try {
    const session = await requireAdminPermission(adminPermissions.USERS);
    const requestContext = await getRequestContext();
    const parsed = createMeetingSchema.safeParse({
      tenantId: formData.get("tenantId"),
      title: sanitizeText(String(formData.get("title") ?? "")),
      category: sanitizeText(String(formData.get("category") ?? "")),
      meetUrl: String(formData.get("meetUrl") ?? ""),
      scheduledAt: String(formData.get("scheduledAt") ?? ""),
      description: sanitizeNullableText(String(formData.get("description") ?? "")) ?? undefined,
    });
    if (!parsed.success) return { error: "Revisa los datos de la reunión." };

    const meeting = await (prisma as unknown as {
      meetingV2: {
        create: (args: {
          data: {
            tenantId: string;
            title: string;
            category: string;
            meetUrl: string | null;
            scheduledAt: Date | null;
            description: string | null;
          };
        }) => Promise<{ id: string; tenantId: string }>;
      };
    }).meetingV2.create({
      data: {
        tenantId: parsed.data.tenantId,
        title: parsed.data.title,
        category: parsed.data.category,
        meetUrl: parsed.data.meetUrl || null,
        scheduledAt: toNullableDate(parsed.data.scheduledAt),
        description: parsed.data.description ?? null,
      },
    });

    await createAuditLog({
      action: "platform.meeting_created",
      targetType: "meeting_v2",
      targetId: meeting.id,
      tenantId: meeting.tenantId,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/admin/meetings");
    return { success: "Reunión creada." };
  } catch {
    return { error: "No pudimos crear la reunión." };
  }
}

export async function updateMeetingV2WithStateAction(
  _: AdminMeetingsActionState,
  formData: FormData,
): Promise<AdminMeetingsActionState> {
  try {
    const session = await requireAdminPermission(adminPermissions.USERS);
    const requestContext = await getRequestContext();
    const parsed = updateMeetingSchema.safeParse({
      meetingId: formData.get("meetingId"),
      title: sanitizeText(String(formData.get("title") ?? "")),
      category: sanitizeText(String(formData.get("category") ?? "")),
      meetUrl: String(formData.get("meetUrl") ?? ""),
      scheduledAt: String(formData.get("scheduledAt") ?? ""),
      description: sanitizeNullableText(String(formData.get("description") ?? "")) ?? undefined,
    });
    if (!parsed.success) return { error: "Revisa los datos antes de guardar." };

    const meeting = await (prisma as unknown as {
      meetingV2: {
        update: (args: {
          where: { id: string };
          data: {
            title: string;
            category: string;
            meetUrl: string | null;
            scheduledAt: Date | null;
            description: string | null;
          };
        }) => Promise<{ id: string; tenantId: string }>;
      };
    }).meetingV2.update({
      where: { id: parsed.data.meetingId },
      data: {
        title: parsed.data.title,
        category: parsed.data.category,
        meetUrl: parsed.data.meetUrl || null,
        scheduledAt: toNullableDate(parsed.data.scheduledAt),
        description: parsed.data.description ?? null,
      },
    });

    await createAuditLog({
      action: "platform.meeting_updated",
      targetType: "meeting_v2",
      targetId: meeting.id,
      tenantId: meeting.tenantId,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/admin/meetings");
    return { success: "Reunión actualizada." };
  } catch {
    return { error: "No pudimos actualizar la reunión." };
  }
}

export async function deleteMeetingV2WithStateAction(
  _: AdminMeetingsActionState,
  formData: FormData,
): Promise<AdminMeetingsActionState> {
  try {
    const session = await requireAdminPermission(adminPermissions.USERS);
    const requestContext = await getRequestContext();
    const parsed = deleteMeetingSchema.safeParse({ meetingId: formData.get("meetingId") });
    if (!parsed.success) return { error: "Reunión inválida." };

    const prismaMeetings = prisma as unknown as {
      meetingV2: { delete: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string }> };
      meetingTaskV2: { deleteMany: (args: { where: { meetingId: string } }) => Promise<unknown> };
      meetingDecisionV2: { deleteMany: (args: { where: { meetingId: string } }) => Promise<unknown> };
      meetingAttachmentV2: { deleteMany: (args: { where: { meetingId: string } }) => Promise<unknown> };
      $transaction: <T>(fn: (tx: {
        meetingV2: { delete: (args: { where: { id: string } }) => Promise<{ id: string; tenantId: string }> };
        meetingTaskV2: { deleteMany: (args: { where: { meetingId: string } }) => Promise<unknown> };
        meetingDecisionV2: { deleteMany: (args: { where: { meetingId: string } }) => Promise<unknown> };
        meetingAttachmentV2: { deleteMany: (args: { where: { meetingId: string } }) => Promise<unknown> };
      }) => Promise<T>) => Promise<T>;
    };
    const meeting = await prismaMeetings.$transaction(async (tx) => {
      await tx.meetingTaskV2.deleteMany({ where: { meetingId: parsed.data.meetingId } });
      await tx.meetingDecisionV2.deleteMany({ where: { meetingId: parsed.data.meetingId } });
      await tx.meetingAttachmentV2.deleteMany({ where: { meetingId: parsed.data.meetingId } });
      return tx.meetingV2.delete({ where: { id: parsed.data.meetingId } });
    });

    await createAuditLog({
      action: "platform.meeting_deleted",
      targetType: "meeting_v2",
      targetId: meeting.id,
      tenantId: meeting.tenantId,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/admin/meetings");
    return { success: "Reunión eliminada." };
  } catch {
    return { error: "No pudimos eliminar la reunión." };
  }
}

export async function addMeetingTaskV2WithStateAction(
  _: AdminMeetingsActionState,
  formData: FormData,
): Promise<AdminMeetingsActionState> {
  try {
    const session = await requireAdminPermission(adminPermissions.USERS);
    const requestContext = await getRequestContext();
    const parsed = addMeetingTaskSchema.safeParse({
      meetingId: formData.get("meetingId"),
      title: sanitizeText(String(formData.get("title") ?? "")),
      dueDate: String(formData.get("dueDate") ?? ""),
      responsibleUserId: String(formData.get("responsibleUserId") ?? ""),
    });
    if (!parsed.success) return { error: "No pudimos crear la tarea." };

    const task = await (prisma as unknown as {
      meetingTaskV2: {
        create: (args: {
          data: {
            meetingId: string;
            title: string;
            dueDate: Date | null;
            responsibleUserId: string | null;
          };
        }) => Promise<{ id: string }>;
      };
    }).meetingTaskV2.create({
      data: {
        meetingId: parsed.data.meetingId,
        title: parsed.data.title,
        dueDate: toNullableDate(parsed.data.dueDate),
        responsibleUserId: parsed.data.responsibleUserId || null,
      },
    });

    await createAuditLog({
      action: "platform.meeting_task_created",
      targetType: "meeting_task_v2",
      targetId: task.id,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });
    revalidatePath("/app/admin/meetings");
    return { success: "Tarea de reunión creada." };
  } catch {
    return { error: "No pudimos crear la tarea." };
  }
}

export async function addMeetingDecisionV2WithStateAction(
  _: AdminMeetingsActionState,
  formData: FormData,
): Promise<AdminMeetingsActionState> {
  try {
    const session = await requireAdminPermission(adminPermissions.USERS);
    const requestContext = await getRequestContext();
    const parsed = addMeetingDecisionSchema.safeParse({
      meetingId: formData.get("meetingId"),
      description: sanitizeText(String(formData.get("description") ?? "")),
    });
    if (!parsed.success) return { error: "No pudimos guardar la decisión." };

    const decision = await (prisma as unknown as {
      meetingDecisionV2: {
        create: (args: { data: { meetingId: string; description: string } }) => Promise<{ id: string }>;
      };
    }).meetingDecisionV2.create({
      data: {
        meetingId: parsed.data.meetingId,
        description: parsed.data.description,
      },
    });

    await createAuditLog({
      action: "platform.meeting_decision_created",
      targetType: "meeting_decision_v2",
      targetId: decision.id,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });
    revalidatePath("/app/admin/meetings");
    return { success: "Decisión agregada." };
  } catch {
    return { error: "No pudimos guardar la decisión." };
  }
}
