"use server";

import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import {
  addSupportNoteSchema,
  addSupportWorklogSchema,
  createSupportSubtaskSchema,
  createSupportKnowledgeSchema,
  createSupportReplyTemplateSchema,
  deleteSupportSubtaskSchema,
  deleteSupportKnowledgeSchema,
  sendSupportReplySchema,
  supportAiFeedbackSchema,
  updateSupportKnowledgeSchema,
  updateSupportSubtaskSchema,
  updateSupportTicketAssigneesSchema,
  updateSupportTicketSchema,
  takeSupportTicketSchema,
  addSupportTicketAttachmentSchema,
} from "@/lib/validators/support";
import { createAuditLog } from "@/server/services/audit-log";
import {
  addSupportTicketNote,
  assignSupportTicket,
  sendSupportReply,
  updateSupportTicketLifecycle,
} from "@/server/services/support";
import {
  createSupportKnowledgeItem,
  deleteSupportKnowledgeItem,
  recordSupportAiFeedback,
  updateSupportKnowledgeItem,
} from "@/server/services/support-knowledge";
import { validateUpload } from "@/lib/security/upload";
import { saveLocalUpload } from "@/lib/storage/local-upload";
import { randomUUID } from "node:crypto";

export type SupportActionState = {
  success?: string;
  error?: string;
  reply?: string;
  knowledgeItemCount?: number;
  responseLogId?: string;
};

function parseKnowledgeTags(rawValue: string) {
  return rawValue
    .split(",")
    .map((tag) => sanitizeText(tag))
    .filter(Boolean);
}

export async function updateSupportTicketAction(
  _: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);

    const parsed = updateSupportTicketSchema.safeParse({
      ticketId: formData.get("ticketId"),
      priority: formData.get("priority"),
      status: formData.get("status"),
      assignmentMode: formData.get("assignmentMode"),
      assignedToUserId:
        sanitizeNullableText(String(formData.get("assignedToUserId") ?? "")) ?? undefined,
      resolutionSummary:
        sanitizeNullableText(String(formData.get("resolutionSummary") ?? "")) ?? undefined,
    });

    if (!parsed.success) {
      return { error: "Revisa estado, prioridad, asignacion y resumen antes de guardar." };
    }

    await assignSupportTicket({
      ticketId: parsed.data.ticketId,
      actorUserId: session.user.id,
      assignedToUserId: parsed.data.assignedToUserId,
      assignmentMode: parsed.data.assignmentMode,
    });

    await updateSupportTicketLifecycle({
      ticketId: parsed.data.ticketId,
      actorUserId: session.user.id,
      status: parsed.data.status,
      priority: parsed.data.priority,
      resolutionSummary: parsed.data.resolutionSummary,
    });

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: parsed.data.ticketId },
      select: { id: true, tenantId: true },
    });

    await createAuditLog({
      action: "support.ticket_updated",
      targetType: "support_ticket",
      targetId: parsed.data.ticketId,
      tenantId: ticket?.tenantId,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        status: parsed.data.status,
        priority: parsed.data.priority,
        assignmentMode: parsed.data.assignmentMode,
      },
    });

    revalidatePath("/app/support");
    revalidatePath("/app/admin");
    return { success: "Ticket actualizado correctamente." };
  } catch {
    return { error: "No pudimos actualizar el ticket." };
  }
}

export async function takeSupportTicketAction(
  _: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);

    const parsed = takeSupportTicketSchema.safeParse({
      ticketId: formData.get("ticketId"),
    });
    if (!parsed.success) return { error: "Ticket invalido." };

    await assignSupportTicket({
      ticketId: parsed.data.ticketId,
      actorUserId: session.user.id,
      assignedToUserId: session.user.id,
      assignmentMode: "MANUAL",
    });

    await createAuditLog({
      action: "support.ticket_taken",
      targetType: "support_ticket",
      targetId: parsed.data.ticketId,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { assignedToUserId: session.user.id },
    });

    revalidatePath("/app/support");
    revalidatePath("/app/admin/tickets");
    return { success: "Ticket tomado y asignado a tu usuario." };
  } catch {
    return { error: "No pudimos tomar este ticket." };
  }
}

export async function addSupportNoteAction(
  _: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);

    const parsed = addSupportNoteSchema.safeParse({
      ticketId: formData.get("ticketId"),
      body: sanitizeText(String(formData.get("body") ?? "")),
      visibility: formData.get("visibility") === "CUSTOMER" ? "CUSTOMER" : "INTERNAL",
    });

    if (!parsed.success) {
      return { error: "Escribe una nota interna clara antes de guardar." };
    }

    const note = await addSupportTicketNote(
      parsed.data.ticketId,
      session.user.id,
      parsed.data.body,
      parsed.data.visibility,
    );

    await createAuditLog({
      action: "support.ticket_note_added",
      targetType: "support_ticket_note",
      targetId: note.id,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: { visibility: parsed.data.visibility },
    });

    revalidatePath("/app/support");
    return {
      success:
        parsed.data.visibility === "CUSTOMER"
          ? "Nota visible para cliente agregada."
          : "Nota interna agregada.",
    };
  } catch {
    return { error: "No pudimos guardar la nota interna." };
  }
}

export async function sendSupportReplyAction(
  _: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);

    const templateId =
      sanitizeNullableText(String(formData.get("templateId") ?? "")) ?? undefined;
    let body = sanitizeText(String(formData.get("body") ?? ""));

    if (templateId && !body) {
      const template = await prisma.supportReplyTemplate.findUnique({
        where: { id: templateId },
        select: { body: true },
      });

      body = template?.body ?? body;
    }

    const parsed = sendSupportReplySchema.safeParse({
      ticketId: formData.get("ticketId"),
      templateId,
      body,
    });

    if (!parsed.success) {
      return { error: "Selecciona o redacta una respuesta valida para el ticket." };
    }

    await sendSupportReply({
      ticketId: parsed.data.ticketId,
      actorUserId: session.user.id,
      body: parsed.data.body,
    });

    await createAuditLog({
      action: "support.ticket_reply_sent",
      targetType: "support_ticket",
      targetId: parsed.data.ticketId,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        templateId: parsed.data.templateId ?? null,
      },
    });

    revalidatePath("/app/support");
    return { success: "Respuesta registrada en el ticket." };
  } catch {
    return { error: "No pudimos registrar la respuesta." };
  }
}

export async function createSupportReplyTemplateAction(
  _: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);

    const parsed = createSupportReplyTemplateSchema.safeParse({
      name: sanitizeText(String(formData.get("name") ?? "")),
      category: sanitizeNullableText(String(formData.get("category") ?? "")) ?? undefined,
      body: sanitizeText(String(formData.get("body") ?? "")),
    });

    if (!parsed.success) {
      return { error: "Revisa nombre, categoria y cuerpo de la respuesta predefinida." };
    }

    const template = await prisma.supportReplyTemplate.create({
      data: {
        name: parsed.data.name,
        category: parsed.data.category,
        body: parsed.data.body,
        createdByUserId: session.user.id,
      },
    });

    await createAuditLog({
      action: "support.reply_template_created",
      targetType: "support_reply_template",
      targetId: template.id,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/support");
    revalidatePath("/app/admin");
    return { success: "Respuesta predefinida creada." };
  } catch {
    return { error: "No pudimos crear la respuesta predefinida." };
  }
}

export async function createSupportKnowledgeAction(
  _: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);

    const parsed = createSupportKnowledgeSchema.safeParse({
      tenantId: sanitizeNullableText(String(formData.get("tenantId") ?? "")) ?? undefined,
      question: sanitizeText(String(formData.get("question") ?? "")),
      answer: sanitizeText(String(formData.get("answer") ?? "")),
      category: sanitizeNullableText(String(formData.get("category") ?? "")) ?? undefined,
      tags: parseKnowledgeTags(String(formData.get("tags") ?? "")),
      isActive: formData.get("isActive") === "on",
    });

    if (!parsed.success) {
      return { error: "Revisa tenant, pregunta, respuesta, categoria y etiquetas." };
    }

    const item = await createSupportKnowledgeItem({
      ...parsed.data,
      createdByUserId: session.user.id,
    });

    await createAuditLog({
      action: "support.knowledge_created",
      targetType: "support_knowledge_item",
      targetId: item.id,
      tenantId: item.tenantId ?? undefined,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/support");
    revalidatePath("/app/support/knowledge");
    revalidatePath("/app/admin/support");
    return { success: "FAQ guardada correctamente." };
  } catch {
    return { error: "No pudimos guardar la FAQ." };
  }
}

export async function updateSupportKnowledgeAction(
  _: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);

    const parsed = updateSupportKnowledgeSchema.safeParse({
      knowledgeId: formData.get("knowledgeId"),
      tenantId: sanitizeNullableText(String(formData.get("tenantId") ?? "")) ?? undefined,
      question: sanitizeText(String(formData.get("question") ?? "")),
      answer: sanitizeText(String(formData.get("answer") ?? "")),
      category: sanitizeNullableText(String(formData.get("category") ?? "")) ?? undefined,
      tags: parseKnowledgeTags(String(formData.get("tags") ?? "")),
      isActive: formData.get("isActive") === "on",
    });

    if (!parsed.success) {
      return { error: "Revisa los datos antes de actualizar la FAQ." };
    }

    const item = await updateSupportKnowledgeItem(parsed.data);

    await createAuditLog({
      action: "support.knowledge_updated",
      targetType: "support_knowledge_item",
      targetId: item.id,
      tenantId: item.tenantId ?? undefined,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/support");
    revalidatePath("/app/support/knowledge");
    revalidatePath("/app/admin/support");
    return { success: "FAQ actualizada." };
  } catch {
    return { error: "No pudimos actualizar la FAQ." };
  }
}

export async function deleteSupportKnowledgeAction(
  _: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);

    const parsed = deleteSupportKnowledgeSchema.safeParse({
      knowledgeId: formData.get("knowledgeId"),
    });

    if (!parsed.success) {
      return { error: "No pudimos identificar la FAQ." };
    }

    const item = await deleteSupportKnowledgeItem({
      knowledgeId: parsed.data.knowledgeId,
      actorPlatformRole:
        session.user.platformRole === "SUPER_ADMIN" ? "SUPER_ADMIN" : "SUPPORT",
    });

    await createAuditLog({
      action: "support.knowledge_deleted",
      targetType: "support_knowledge_item",
      targetId: item.id,
      tenantId: item.tenantId ?? undefined,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/support");
    revalidatePath("/app/support/knowledge");
    revalidatePath("/app/admin/support");
    return { success: "FAQ eliminada." };
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN_GLOBAL_DELETE") {
      return { error: "Solo un master admin puede eliminar FAQs globales." };
    }

    return { error: "No pudimos eliminar la FAQ." };
  }
}

export async function previewSupportKnowledgeReplyAction(
  _: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);

    const message = sanitizeText(String(formData.get("message") ?? ""));
    const tenantId = sanitizeNullableText(String(formData.get("tenantId") ?? "")) ?? undefined;

    if (!message) {
      return { error: "Escribe una consulta para probar la respuesta asistida por FAQs." };
    }

    const { generateSupportAiReply } = await import("@/server/services/support-ai");
    const result = await generateSupportAiReply({
      message,
      tenantId,
      requestedByUserId: session.user.id,
    });

    return {
      success: "Respuesta generada con la base de conocimiento actual.",
      reply: result.reply,
      knowledgeItemCount: result.knowledgeItems.length,
      responseLogId: result.responseLogId,
    };
  } catch {
    return { error: "No pudimos generar una respuesta asistida por IA." };
  }
}

export async function recordSupportAiFeedbackAction(
  _: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);

    const parsed = supportAiFeedbackSchema.safeParse({
      responseLogId: formData.get("responseLogId"),
      helpful: String(formData.get("helpful") ?? "") === "true",
      feedbackNote: sanitizeNullableText(String(formData.get("feedbackNote") ?? "")) ?? undefined,
    });

    if (!parsed.success) {
      return { error: "No pudimos registrar el feedback de la respuesta." };
    }

    await recordSupportAiFeedback(parsed.data);

    return {
      success: parsed.data.helpful
        ? "Marcaste la respuesta como útil."
        : "Marcaste la respuesta como no útil.",
    };
  } catch {
    return { error: "No pudimos guardar el feedback." };
  }
}

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

export async function updateSupportTicketAssigneesAction(
  _: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  try {
    const requestContext = await getRequestContext();
    const session = await requireVerifiedUser();
    await requireVerifiedPlatformRole(platformRoles.SUPPORT);

    const assigneeIds = Array.from(
      new Set(
        formData
          .getAll("assigneeIds")
          .map((value) => sanitizeNullableText(String(value ?? "")))
          .filter((value): value is string => Boolean(value)),
      ),
    );
    const primaryAssigneeId =
      sanitizeNullableText(String(formData.get("primaryAssigneeId") ?? "")) ?? undefined;

    const parsed = updateSupportTicketAssigneesSchema.safeParse({
      ticketId: formData.get("ticketId"),
      assigneeIds,
      primaryAssigneeId,
    });
    if (!parsed.success) return { error: "No pudimos validar los responsables seleccionados." };

    if (
      parsed.data.primaryAssigneeId &&
      !parsed.data.assigneeIds.includes(parsed.data.primaryAssigneeId)
    ) {
      return { error: "El responsable principal debe estar dentro de los asignados." };
    }

    const validAgents = await prisma.user.findMany({
      where: {
        id: { in: parsed.data.assigneeIds },
        platformRole: { in: ["SUPPORT", "SUPER_ADMIN"] },
      },
      select: { id: true },
    });
    const validAgentIds = new Set(validAgents.map((user) => user.id));
    const normalizedAssigneeIds = parsed.data.assigneeIds.filter((id) => validAgentIds.has(id));

    if (normalizedAssigneeIds.length !== parsed.data.assigneeIds.length) {
      return { error: "Uno o mas responsables no tienen permisos para soporte." };
    }

    const fallbackPrimary = normalizedAssigneeIds[0] ?? null;
    const primaryId =
      (parsed.data.primaryAssigneeId && normalizedAssigneeIds.includes(parsed.data.primaryAssigneeId)
        ? parsed.data.primaryAssigneeId
        : fallbackPrimary) ?? null;

    await prisma.$transaction(async (tx) => {
      await tx.supportTicketAssignee.deleteMany({
        where: { ticketId: parsed.data.ticketId },
      });

      if (normalizedAssigneeIds.length > 0) {
        await tx.supportTicketAssignee.createMany({
          data: normalizedAssigneeIds.map((userId) => ({
            ticketId: parsed.data.ticketId,
            userId,
            isPrimary: primaryId === userId,
          })),
        });
      }

      await tx.supportTicket.update({
        where: { id: parsed.data.ticketId },
        data: {
          assignedToUserId: primaryId,
          assignmentMode: "MANUAL",
        },
      });
    });

    await createAuditLog({
      action: "support.ticket_assignees_updated",
      targetType: "support_ticket",
      targetId: parsed.data.ticketId,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      metadata: {
        assigneeIds: normalizedAssigneeIds,
        primaryAssigneeId: primaryId,
      },
    });

    revalidatePath("/app/admin/tickets");
    revalidatePath("/app/support");
    return { success: "Responsables actualizados." };
  } catch {
    return { error: "No pudimos guardar los responsables." };
  }
}
