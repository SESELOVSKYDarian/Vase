"use server";

import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import {
  addSupportNoteSchema,
  createSupportReplyTemplateSchema,
  sendSupportReplySchema,
  updateSupportTicketSchema,
} from "@/lib/validators/support";
import { createAuditLog } from "@/server/services/audit-log";
import {
  addSupportTicketNote,
  assignSupportTicket,
  sendSupportReply,
  updateSupportTicketLifecycle,
} from "@/server/services/support";

export type SupportActionState = {
  success?: string;
  error?: string;
};

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
    });

    if (!parsed.success) {
      return { error: "Escribe una nota interna clara antes de guardar." };
    }

    const note = await addSupportTicketNote(parsed.data.ticketId, session.user.id, parsed.data.body);

    await createAuditLog({
      action: "support.ticket_note_added",
      targetType: "support_ticket_note",
      targetId: note.id,
      actorUserId: session.user.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
    });

    revalidatePath("/app/support");
    return { success: "Nota interna agregada." };
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
