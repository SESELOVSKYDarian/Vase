"use server";

// Parte de actions.ts: addSupportTicketAttachmentAction, createSupportSubtaskAction, updateSupportSubtaskAction, deleteSupportSubtaskAction, addSupportWorklogAction.
import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { addSupportTicketAttachmentSchema, addSupportWorklogSchema, createSupportSubtaskSchema, deleteSupportSubtaskSchema, updateSupportSubtaskSchema } from "@/lib/validators/support";
import { createAuditLog } from "@/server/services/audit-log";
import { validateUpload } from "@/lib/security/upload";
import { saveLocalUpload } from "@/lib/storage/local-upload";
import { randomUUID } from "node:crypto";
import { SupportActionState } from "./support-action-state";

export async function addSupportTicketAttachmentAction(
  _: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);

    const parsed = addSupportTicketAttachmentSchema.safeParse({
      ticketId: formData.get("ticketId"),
    });
    if (!parsed.success) return { error: "Ticket invalido." };

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Selecciona un archivo valido." };
    }

    const metadata = await validateUpload(file);
    const buffer = new Uint8Array(await file.arrayBuffer());
    const relativePath = `internal/support-tickets/${parsed.data.ticketId}/${Date.now()}-${randomUUID()}-${metadata.originalName}`;
    const stored = await saveLocalUpload({
      relativePath,
      bytes: buffer,
    });

    const attachment = await prisma.supportTicketAttachment.create({
      data: {
        ticketId: parsed.data.ticketId,
        fileName: metadata.originalName,
        mimeType: metadata.type,
        sizeBytes: metadata.size,
        storagePath: stored.relativePath,
        uploadedById: session.user.id,
      },
    });

    await createAuditLog({
      action: "support.ticket_attachment_added",
      targetType: "support_ticket_attachment",
      targetId: attachment.id,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        ticketId: parsed.data.ticketId,
        fileName: attachment.fileName,
        sizeBytes: attachment.sizeBytes,
      },
    });

    revalidatePath("/app/support");
    revalidatePath("/app/admin/tickets");
    return { success: "Adjunto subido al ticket." };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "FILE_TOO_LARGE") return { error: "Archivo demasiado grande." };
      if (error.message === "FILE_EXTENSION_NOT_ALLOWED") return { error: "Extension no permitida." };
      if (error.message === "FILE_TYPE_NOT_ALLOWED") return { error: "Tipo de archivo no permitido." };
      if (error.message === "FILE_SIGNATURE_INVALID") return { error: "Firma de archivo invalida." };
      if (error.message === "FILE_MALWARE_DETECTED") return { error: "Se detecto posible malware en el archivo." };
    }
    return { error: "No pudimos subir el adjunto." };
  }
}

export async function createSupportSubtaskAction(
  _: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);

    const parsed = createSupportSubtaskSchema.safeParse({
      ticketId: formData.get("ticketId"),
      title: sanitizeText(String(formData.get("title") ?? "")),
      assignedToUserId: sanitizeNullableText(String(formData.get("assignedToUserId") ?? "")) ?? undefined,
    });
    if (!parsed.success) return { error: "Subtarea invalida." };

    const created = await prisma.supportTicketSubtask.create({
      data: {
        ticketId: parsed.data.ticketId,
        title: parsed.data.title,
        assignedToUserId: parsed.data.assignedToUserId,
        createdByUserId: session.user.id,
      },
    });

    await createAuditLog({
      action: "support.ticket_subtask_created",
      targetType: "support_ticket_subtask",
      targetId: created.id,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { ticketId: parsed.data.ticketId },
    });

    revalidatePath("/app/admin/tickets");
    revalidatePath("/app/support");
    return { success: "Subtarea creada." };
  } catch {
    return { error: "No pudimos crear la subtarea." };
  }
}

export async function updateSupportSubtaskAction(
  _: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);

    const parsed = updateSupportSubtaskSchema.safeParse({
      subtaskId: formData.get("subtaskId"),
      status: sanitizeNullableText(String(formData.get("status") ?? "")) ?? undefined,
      title: sanitizeNullableText(String(formData.get("title") ?? "")) ?? undefined,
      assignedToUserId: sanitizeNullableText(String(formData.get("assignedToUserId") ?? "")) ?? undefined,
    });
    if (!parsed.success) return { error: "No pudimos actualizar la subtarea." };

    const subtask = await prisma.supportTicketSubtask.update({
      where: { id: parsed.data.subtaskId },
      data: {
        ...(parsed.data.status ? { status: parsed.data.status } : {}),
        ...(parsed.data.title ? { title: parsed.data.title } : {}),
        assignedToUserId: parsed.data.assignedToUserId ?? null,
      },
      select: { id: true, ticketId: true },
    });

    await createAuditLog({
      action: "support.ticket_subtask_updated",
      targetType: "support_ticket_subtask",
      targetId: subtask.id,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { ticketId: subtask.ticketId },
    });

    revalidatePath("/app/admin/tickets");
    revalidatePath("/app/support");
    return { success: "Subtarea actualizada." };
  } catch {
    return { error: "No pudimos actualizar la subtarea." };
  }
}

export async function deleteSupportSubtaskAction(
  _: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);
    const parsed = deleteSupportSubtaskSchema.safeParse({
      subtaskId: formData.get("subtaskId"),
    });
    if (!parsed.success) return { error: "Subtarea invalida." };

    const deleted = await prisma.supportTicketSubtask.delete({
      where: { id: parsed.data.subtaskId },
      select: { id: true, ticketId: true },
    });

    await createAuditLog({
      action: "support.ticket_subtask_deleted",
      targetType: "support_ticket_subtask",
      targetId: deleted.id,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { ticketId: deleted.ticketId },
    });

    revalidatePath("/app/admin/tickets");
    revalidatePath("/app/support");
    return { success: "Subtarea eliminada." };
  } catch {
    return { error: "No pudimos eliminar la subtarea." };
  }
}

export async function addSupportWorklogAction(
  _: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);
    const parsed = addSupportWorklogSchema.safeParse({
      ticketId: formData.get("ticketId"),
      minutes: formData.get("minutes"),
      note: sanitizeNullableText(String(formData.get("note") ?? "")) ?? undefined,
    });
    if (!parsed.success) return { error: "Registro de horas invalido." };

    const worklog = await prisma.supportTicketWorklog.create({
      data: {
        ticketId: parsed.data.ticketId,
        actorUserId: session.user.id,
        minutes: parsed.data.minutes,
        note: parsed.data.note,
      },
    });

    await createAuditLog({
      action: "support.ticket_worklog_added",
      targetType: "support_ticket_worklog",
      targetId: worklog.id,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { ticketId: parsed.data.ticketId, minutes: parsed.data.minutes },
    });

    revalidatePath("/app/admin/tickets");
    revalidatePath("/app/support");
    return { success: "Horas registradas." };
  } catch {
    return { error: "No pudimos registrar las horas." };
  }
}
