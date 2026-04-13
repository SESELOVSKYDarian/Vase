import { prisma } from "@/lib/db/prisma";

type ActiveSupportTicketStatus =
  | "QUEUED"
  | "ASSIGNED"
  | "WAITING_CUSTOMER"
  | "WAITING_INTERNAL";

const ACTIVE_TICKET_STATUSES: ActiveSupportTicketStatus[] = [
  "QUEUED",
  "ASSIGNED",
  "WAITING_CUSTOMER",
  "WAITING_INTERNAL",
];

export async function getSupportQueueDashboard() {
  const [tickets, templates, notifications, rawAgents] = await Promise.all([
    prisma.supportTicket.findMany({
      orderBy: [
        { priority: "desc" },
        { queueEnteredAt: "asc" },
      ],
      take: 20,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            accountName: true,
          },
        },
        assignedToUser: {
          select: {
            id: true,
            name: true,
            platformRole: true,
          },
        },
        conversation: {
          select: {
            id: true,
            channelType: true,
            summary: true,
          },
        },
        events: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            actorUser: {
              select: {
                name: true,
              },
            },
          },
        },
        notes: {
          orderBy: { createdAt: "desc" },
          take: 3,
          include: {
            authorUser: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.supportReplyTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ tenantId: "asc" }, { name: "asc" }],
      take: 20,
    }),
    prisma.supportNotification.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: {
        recipientUser: {
          select: {
            name: true,
          },
        },
        ticket: {
          select: {
            subject: true,
            status: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        platformRole: {
          in: ["SUPPORT", "SUPER_ADMIN"],
        },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        platformRole: true,
      },
    }),
  ]);

  type SupportQueueTicket = (typeof tickets)[number];
  type SupportQueueNotification = (typeof notifications)[number];
  const agents = await Promise.all(
    rawAgents.map(async (agent) => ({
      ...agent,
      activeAssignments: await prisma.supportTicket.count({
        where: {
          assignedToUserId: agent.id,
          status: {
            in: ACTIVE_TICKET_STATUSES,
          },
        },
      }),
    })),
  );

  const queued = tickets.filter((ticket: SupportQueueTicket) => ticket.status === "QUEUED");
  const assigned = tickets.filter((ticket: SupportQueueTicket) => ticket.status === "ASSIGNED");
  const overdue = tickets.filter(
    (ticket: SupportQueueTicket) =>
      Date.now() - ticket.waitingSince.getTime() > ticket.estimatedWaitMinutes * 60_000,
  );

  return {
    tickets,
    templates,
    notifications,
    agents,
    summary: {
      total: tickets.length,
      queued: queued.length,
      assigned: assigned.length,
      overdue: overdue.length,
      unreadNotifications: notifications.filter(
        (notification: SupportQueueNotification) => !notification.readAt,
      ).length,
    },
  };
}

export async function getTenantSupportOverview(tenantId: string) {
  const [tickets, templates, notifications] = await Promise.all([
    prisma.supportTicket.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: {
        assignedToUser: {
          select: {
            id: true,
            name: true,
          },
        },
        events: {
          orderBy: { createdAt: "desc" },
          take: 4,
          include: {
            actorUser: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.supportReplyTemplate.findMany({
      where: {
        OR: [{ tenantId }, { tenantId: null }],
        isActive: true,
      },
      orderBy: [{ tenantId: "desc" }, { name: "asc" }],
      take: 10,
    }),
    prisma.supportNotification.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  type TenantSupportTicket = (typeof tickets)[number];
  const activeTickets = tickets.filter(
    (ticket: TenantSupportTicket) =>
      ticket.status === "QUEUED" ||
      ticket.status === "ASSIGNED" ||
      ticket.status === "WAITING_CUSTOMER" ||
      ticket.status === "WAITING_INTERNAL",
  );

  return {
    tickets,
    templates,
    notifications,
    summary: {
      total: tickets.length,
      active: activeTickets.length,
      resolved: tickets.filter((ticket: TenantSupportTicket) => ticket.status === "RESOLVED")
        .length,
      queued: tickets.filter((ticket: TenantSupportTicket) => ticket.status === "QUEUED").length,
    },
  };
}

export async function getTenantSupportWidgetContext(tenantId: string) {
  const [overview, conversations] = await Promise.all([
    getTenantSupportOverview(tenantId),
    prisma.aiConversation.findMany({
      where: { tenantId },
      orderBy: { lastMessageAt: "desc" },
      take: 6,
      select: {
        id: true,
        customerName: true,
        customerContact: true,
        channelType: true,
        lastMessageAt: true,
      },
    }),
  ]);

  return {
    summary: overview.summary,
    conversationOptions: conversations.map((conversation) => {
      const reference =
        conversation.customerName ||
        conversation.customerContact ||
        `Conversación ${conversation.channelType.toLowerCase()}`;

      return {
        id: conversation.id,
        label: `${reference} · ${new Intl.DateTimeFormat("es-AR", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(conversation.lastMessageAt)}`,
      };
    }),
  };
}
