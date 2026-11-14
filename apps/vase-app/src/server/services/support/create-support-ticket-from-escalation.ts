// Parte de support.ts: SupportAssignmentMode, SupportTicketPriority, SupportTicketStatus, ACTIVE_SUPPORT_STATUSES, createSupportTicketEvent, createSupportNotifications y más.
import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createAutoAdminNotification } from "@/server/services/admin-notifications-auto";

export type SupportAssignmentMode = "MANUAL" | "AUTOMATIC";
export type SupportTicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type SupportTicketStatus =
  | "QUEUED"
  | "ASSIGNED"
  | "WAITING_CUSTOMER"
  | "WAITING_INTERNAL"
  | "RESOLVED"
  | "RETURNED_TO_AI"
  | "CLOSED";

export const ACTIVE_SUPPORT_STATUSES: SupportTicketStatus[] = [
  "QUEUED",
  "ASSIGNED",
  "WAITING_CUSTOMER",
  "WAITING_INTERNAL",
];

export async function createSupportTicketEvent(
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

    await createAutoAdminNotification({
      title: "Solicitud de derivacion a humano",
      message: `La conversacion "${payload.subject}" fue derivada y requiere atencion humana.`,
      href: `/app/owner/labs/inbox?conversationId=${encodeURIComponent(payload.conversationId)}`,
      category: "support",
      tone: "warning",
      tenantId: payload.tenantId,
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
    if (ticket.priority === "URGENT") {
      await createAutoAdminNotification({
        title: "Ticket urgente asignado",
        message: `El ticket "${ticket.subject}" se asignó automáticamente con prioridad urgente.`,
        category: "support",
        tone: "danger",
        targetRole: "SUPPORT",
        tenantId: ticket.tenantId,
      });
    }
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
    await createAutoAdminNotification({
      title: "Ticket sin asignar en cola",
      message: `El ticket "${ticket.subject}" quedó en cola sin agente disponible.`,
      category: "support",
      tone: "warning",
      targetRole: "SUPPORT",
      tenantId: ticket.tenantId,
    });
  }

  return ticket;
}
