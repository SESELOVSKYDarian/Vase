// Parte de support.ts: assignSupportTicket, addSupportTicketNote, sendSupportReply, updateSupportTicketLifecycle.
import { prisma } from "@/lib/db/prisma";
import { createAutoAdminNotification } from "@/server/services/admin-notifications-auto";
import { SupportAssignmentMode, SupportTicketPriority, SupportTicketStatus, createSupportNotifications, createSupportTicketEvent, getAutomaticSupportAssignee } from "./create-support-ticket-from-escalation";

export async function assignSupportTicket(payload: {
  ticketId: string;
  actorUserId: string;
  assignedToUserId?: string;
  assignmentMode: SupportAssignmentMode;
}) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: payload.ticketId },
    select: {
      id: true,
      tenantId: true,
      subject: true,
    },
  });

  if (!ticket) {
    throw new Error("TICKET_NOT_FOUND");
  }

  const assignee =
    payload.assignmentMode === "AUTOMATIC"
      ? await getAutomaticSupportAssignee()
      : payload.assignedToUserId
        ? await prisma.user.findUnique({
            where: { id: payload.assignedToUserId },
            select: { id: true, name: true },
          })
        : null;

  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: {
      assignmentMode: payload.assignmentMode,
      assignedToUserId: assignee?.id ?? null,
      status: assignee ? "ASSIGNED" : "QUEUED",
      firstAssignedAt: assignee ? new Date() : undefined,
      waitingSince: new Date(),
    },
  });

  await createSupportTicketEvent(
    ticket.id,
    "ASSIGNED",
    assignee
      ? `Ticket asignado a ${assignee.name}.`
      : "Ticket movido nuevamente a la cola general.",
    payload.actorUserId,
    {
      assignmentMode: payload.assignmentMode,
      assignedToUserId: assignee?.id ?? null,
    },
  );

  if (assignee) {
    await createSupportNotifications(
      ticket.id,
      ticket.tenantId,
      "TICKET_ASSIGNED",
      "Ticket asignado",
      `Se te asigno ${ticket.subject}.`,
      [assignee.id],
    );
    if (assignee.id !== payload.actorUserId) {
      await createAutoAdminNotification({
        title: "Ticket reasignado",
        message: `Se reasignó el ticket "${ticket.subject}" a ${assignee.name}.`,
        category: "support",
        tone: "info",
        targetRole: "SUPPORT",
        tenantId: ticket.tenantId,
      });
    }
  }
}

export async function addSupportTicketNote(
  ticketId: string,
  authorUserId: string,
  body: string,
  visibility: "INTERNAL" | "CUSTOMER" = "INTERNAL",
) {
  const note = await prisma.supportTicketNote.create({
    data: {
      ticketId,
      authorUserId,
      body,
      visibility,
    },
  });

  await createSupportTicketEvent(
    ticketId,
    "NOTE_ADDED",
    visibility === "CUSTOMER"
      ? "Se agrego una nota visible para cliente."
      : "Se agrego una nota interna al ticket.",
    authorUserId,
  );

  return note;
}

export async function sendSupportReply(payload: {
  ticketId: string;
  actorUserId: string;
  body: string;
}) {
  const ticket = await prisma.supportTicket.update({
    where: { id: payload.ticketId },
    data: {
      status: "WAITING_CUSTOMER",
      firstResponseAt: new Date(),
      lastAgentMessageAt: new Date(),
      waitingSince: new Date(),
    },
    select: {
      id: true,
      tenantId: true,
      subject: true,
      createdByUserId: true,
    },
  });

  await createSupportTicketEvent(
    ticket.id,
    "AGENT_REPLIED",
    payload.body,
    payload.actorUserId,
  );

  if (ticket.createdByUserId) {
    await createSupportNotifications(
      ticket.id,
      ticket.tenantId,
      "STATUS_UPDATED",
      "Tu ticket recibio una respuesta",
      `El equipo respondio el ticket ${ticket.subject}.`,
      [ticket.createdByUserId],
    );
  }
}

export async function updateSupportTicketLifecycle(payload: {
  ticketId: string;
  actorUserId: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  resolutionSummary?: string | null;
}) {
  const existing = await prisma.supportTicket.findUnique({
    where: { id: payload.ticketId },
    select: {
      id: true,
      tenantId: true,
      conversationId: true,
      createdByUserId: true,
      status: true,
      priority: true,
      subject: true,
    },
  });

  if (!existing) {
    throw new Error("TICKET_NOT_FOUND");
  }

  await prisma.supportTicket.update({
    where: { id: existing.id },
    data: {
      status: payload.status,
      priority: payload.priority,
      resolutionSummary: payload.resolutionSummary ?? undefined,
      resolvedAt: payload.status === "RESOLVED" ? new Date() : undefined,
      returnedToAiAt: payload.status === "RETURNED_TO_AI" ? new Date() : undefined,
      closedAt: payload.status === "CLOSED" ? new Date() : undefined,
      waitingSince: new Date(),
    },
  });

  if (existing.priority !== payload.priority) {
    await createSupportTicketEvent(
      existing.id,
      "PRIORITY_CHANGED",
      `Prioridad actualizada a ${payload.priority}.`,
      payload.actorUserId,
    );
  }

  if (existing.status !== payload.status) {
    const eventType =
      payload.status === "RETURNED_TO_AI"
        ? "RETURNED_TO_AI"
        : payload.status === "RESOLVED"
          ? "RESOLVED"
          : payload.status === "CLOSED"
            ? "CLOSED"
            : "STATUS_CHANGED";

    await createSupportTicketEvent(
      existing.id,
      eventType,
      payload.resolutionSummary
        ? payload.resolutionSummary
        : `Estado actualizado a ${payload.status}.`,
      payload.actorUserId,
    );
  }

  if (payload.status === "RETURNED_TO_AI" && existing.conversationId) {
    await prisma.aiConversation.update({
      where: { id: existing.conversationId },
      data: {
        status: "OPEN",
        escalatedToHuman: false,
      },
    });
  }

  if (existing.createdByUserId) {
    await createSupportNotifications(
      existing.id,
      existing.tenantId,
      "STATUS_UPDATED",
      "Actualizacion de ticket",
      `El ticket ${existing.subject} cambio a ${payload.status}.`,
      [existing.createdByUserId],
    );
  }

  if (payload.status === "WAITING_INTERNAL") {
    await createAutoAdminNotification({
      title: "Ticket esperando equipo interno",
      message: `El ticket "${existing.subject}" quedó en estado WAITING_INTERNAL.`,
      category: "support",
      tone: "warning",
      targetRole: "SUPPORT",
      tenantId: existing.tenantId,
    });
  }
}
