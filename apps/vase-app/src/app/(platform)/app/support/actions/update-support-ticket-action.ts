"use server";

// Parte de actions.ts: updateSupportTicketAction, takeSupportTicketAction, addSupportNoteAction, sendSupportReplyAction.
import { revalidatePath } from "next/cache";
import { platformRoles, requireVerifiedPlatformRole, requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { addSupportNoteSchema, sendSupportReplySchema, takeSupportTicketSchema, updateSupportTicketSchema } from "@/lib/validators/support";
import { createAuditLog } from "@/server/services/audit-log";
import { addSupportTicketNote, assignSupportTicket, sendSupportReply, updateSupportTicketLifecycle } from "@/server/services/support";
import { SupportActionState } from "./support-action-state";

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
