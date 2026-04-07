import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type SupportAssignmentMode = "MANUAL" | "AUTOMATIC";
type SupportTicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
type SupportTicketStatus =
  | "QUEUED"
  | "ASSIGNED"
  | "WAITING_CUSTOMER"
  | "WAITING_INTERNAL"
  | "RESOLVED"
  | "RETURNED_TO_AI"
  | "CLOSED";

const ACTIVE_SUPPORT_STATUSES: SupportTicketStatus[] = [
  "QUEUED",
  "ASSIGNED",
  "WAITING_CUSTOMER",
  "WAITING_INTERNAL",
];

async function createSupportTicketEvent(
  ticketId: string,
  eventType:
    | "CREATED"
    | "ESCALATED_FROM_AI"
    | "ASSIGNED"
    | "STATUS_CHANGED"
    | "PRIORITY_CHANGED"
    | "NOTE_ADDED"
    | "AGENT_REPLIED"
    | "CUSTOMER_UPDATED"
    | "RETURNED_TO_AI"
    | "RESOLVED"
    | "CLOSED",
  message: string,
  actorUserId?: string,
  metadata?: Record<string, unknown>,
) {
  await prisma.supportTicketEvent.create({
    data: {
      ticketId,
      actorUserId,
      eventType,
      message,
      metadata: metadata as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function createSupportNotifications(
  ticketId: string,
  tenantId: string,
  type: "NEW_TICKET" | "TICKET_ASSIGNED" | "WAITING_TOO_LONG" | "CUSTOMER_REPLY" | "STATUS_UPDATED",
  title: string,
  message: string,
  recipientUserIds: string[],
) {
  if (recipientUserIds.length === 0) {
    return;
  }

  await prisma.supportNotification.createMany({
    data: recipientUserIds.map((recipientUserId) => ({
      ticketId,
      tenantId,
      recipientUserId,
      type,
      title,
      message,
    })),
  });
}

export async function getAutomaticSupportAssignee() {
  const agents = await prisma.user.findMany({
    where: {
      platformRole: {
        in: ["SUPPORT", "SUPER_ADMIN"],
      },
    },
    select: {
      id: true,
      name: true,
      platformRole: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (agents.length === 0) {
    return null;
  }

  const agentsWithLoad = await Promise.all(
    agents.map(async (agent) => ({
      ...agent,
      activeAssignments: await prisma.supportTicket.count({
        where: {
          assignedToUserId: agent.id,
          status: {
            in: ACTIVE_SUPPORT_STATUSES,
          },
        },
      }),
    })),
  );

  return agentsWithLoad.sort(
    (left, right) =>
      left.activeAssignments - right.activeAssignments ||
      left.createdAt.getTime() - right.createdAt.getTime(),
  )[0];
}

export async function createSupportTicketFromEscalation(payload: {
  tenantId: string;
  workspaceId?: string | null;
  conversationId?: string | null;
  createdByUserId?: string;
  subject: string;
  customerName?: string | null;
  customerContact?: string | null;
  aiSummary?: string | null;
  priority?: SupportTicketPriority;
}) {
  if (payload.conversationId) {
    const existing = await prisma.supportTicket.findUnique({
      where: { conversationId: payload.conversationId },
    });

    if (existing) {
      return existing;
    }
  }

  const assignee = await getAutomaticSupportAssignee();
  const assignmentMode: SupportAssignmentMode = assignee ? "AUTOMATIC" : "MANUAL";
  const status: SupportTicketStatus = assignee ? "ASSIGNED" : "QUEUED";
  const now = new Date();

  const ticket = await prisma.supportTicket.create({
    data: {
      tenantId: payload.tenantId,
      workspaceId: payload.workspaceId ?? undefined,
      conversationId: payload.conversationId ?? undefined,
      createdByUserId: payload.createdByUserId,
      assignedToUserId: assignee?.id,
      assignmentMode,
      source: payload.conversationId ? "AI_ESCALATION" : "MANUAL",
      priority: payload.priority ?? "NORMAL",
      status,
      subject: payload.subject,
      customerName: payload.customerName,
      customerContact: payload.customerContact,
      aiSummary: payload.aiSummary,
      waitingSince: now,
      firstAssignedAt: assignee ? now : undefined,
    },
  });

  if (payload.conversationId) {
    await prisma.aiConversation.update({
      where: { id: payload.conversationId },
      data: {
        status: "ESCALATED",
        escalatedToHuman: true,
        escalationRequestedAt: now,
      },
    });
  }

  await createSupportTicketEvent(
    ticket.id,
    payload.conversationId ? "ESCALATED_FROM_AI" : "CREATED",
    payload.conversationId
      ? "Conversacion derivada desde IA a soporte humano."
      : "Ticket creado manualmente para soporte humano.",
    payload.createdByUserId,
  );

  if (assignee) {
    await createSupportTicketEvent(
      ticket.id,
      "ASSIGNED",
      `Ticket asignado automaticamente a ${assignee.name}.`,
      assignee.id,
      { assignmentMode },
    );

    await createSupportNotifications(
      ticket.id,
      ticket.tenantId,
      "TICKET_ASSIGNED",
      "Nuevo ticket asignado",
      `Se te asigno el ticket ${ticket.subject}.`,
      [assignee.id],
    );
  } else {
    const agents = await prisma.user.findMany({
      where: {
        platformRole: {
          in: ["SUPPORT", "SUPER_ADMIN"],
        },
      },
      select: { id: true },
    });

    await createSupportNotifications(
      ticket.id,
      ticket.tenantId,
      "NEW_TICKET",
      "Nuevo ticket en cola",
      `Hay un nuevo ticket pendiente: ${ticket.subject}.`,
      agents.map((agent) => agent.id),
    );
  }

  return ticket;
}

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
  }
}

export async function addSupportTicketNote(ticketId: string, authorUserId: string, body: string) {
  const note = await prisma.supportTicketNote.create({
    data: {
      ticketId,
      authorUserId,
      body,
    },
  });

  await createSupportTicketEvent(
    ticketId,
    "NOTE_ADDED",
    "Se agrego una nota interna al ticket.",
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
}
