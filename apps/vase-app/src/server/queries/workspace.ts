import { prisma } from "@/lib/db/prisma";
import {
  STATUS_LABEL,
  columnFor,
  itemCode,
  itemKey,
  normalizePriority,
  priorityInfo,
  type WorkspaceColumn,
  type WorkspaceKind,
  type WorkspacePriority,
} from "@/lib/workspace/board";

export type WorkspaceScope = "all" | "tickets" | "tasks" | "mine";

export type WorkspaceItem = {
  key: string;
  kind: WorkspaceKind;
  id: string;
  code: string;
  title: string;
  client: string | null;
  column: WorkspaceColumn;
  status: string;
  statusLabel: string;
  priority: WorkspacePriority;
  priorityRank: number;
  assignee: { id: string; name: string } | null;
  dueAt: string | null;
  updatedAt: string;
  comments: number;
};

const DONE_DAYS = 30;

export async function listWorkspaceAgents() {
  return prisma.user.findMany({
    where: { platformRole: { in: ["SUPER_ADMIN", "SUPPORT", "DEVELOPER"] }, isDisabled: false },
    select: { id: true, name: true, platformRole: true },
    orderBy: { name: "asc" },
  });
}

/** Todo lo abierto más lo terminado en los últimos 30 días, ordenado por prioridad y fecha. */
export async function listWorkspaceItems({ scope, q, userId }: { scope: WorkspaceScope; q?: string; userId: string }) {
  const since = new Date(Date.now() - DONE_DAYS * 24 * 60 * 60 * 1000);
  const text = q?.trim().slice(0, 80) || undefined;
  const mine = scope === "mine";

  const [tickets, tasks] = await Promise.all([
    scope === "tasks"
      ? []
      : prisma.supportTicket.findMany({
          where: {
            AND: [
              { OR: [{ status: { notIn: ["RESOLVED", "CLOSED"] } }, { updatedAt: { gte: since } }] },
              ...(mine ? [{ OR: [{ assignedToUserId: userId }, { assignees: { some: { userId } } }] }] : []),
              ...(text ? [{ OR: [{ subject: { contains: text } }, { customerName: { contains: text } }, { tenant: { accountName: { contains: text } } }] }] : []),
            ],
          },
          select: {
            id: true,
            subject: true,
            status: true,
            priority: true,
            updatedAt: true,
            tenant: { select: { accountName: true } },
            assignedToUser: { select: { id: true, name: true } },
            _count: { select: { notes: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 300,
        }),
    scope === "tickets"
      ? []
      : prisma.devTask.findMany({
          where: {
            OR: [{ status: { notIn: ["COMPLETED", "CANCELED"] } }, { updatedAt: { gte: since } }],
            ...(mine ? { assignedToUserId: userId } : {}),
            ...(text ? { AND: [{ OR: [{ title: { contains: text } }, { projectReference: { contains: text } }] }] } : {}),
          },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueAt: true,
            updatedAt: true,
            tenant: { select: { accountName: true } },
            clientAccount: { select: { name: true } },
            assignedToUser: { select: { id: true, name: true } },
            _count: { select: { comments: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 300,
        }),
  ]);

  const items: WorkspaceItem[] = [
    ...tickets.map((ticket) => {
      const priority = normalizePriority(ticket.priority);
      return {
        key: itemKey("ticket", ticket.id),
        kind: "ticket" as const,
        id: ticket.id,
        code: itemCode("ticket", ticket.id),
        title: ticket.subject,
        client: ticket.tenant.accountName,
        column: columnFor("ticket", ticket.status),
        status: ticket.status,
        statusLabel: STATUS_LABEL[ticket.status] ?? ticket.status,
        priority,
        priorityRank: priorityInfo(priority).rank,
        assignee: ticket.assignedToUser,
        dueAt: null,
        updatedAt: ticket.updatedAt.toISOString(),
        comments: ticket._count.notes,
      };
    }),
    ...tasks.map((task) => {
      const priority = normalizePriority(task.priority);
      return {
        key: itemKey("task", task.id),
        kind: "task" as const,
        id: task.id,
        code: itemCode("task", task.id),
        title: task.title,
        client: task.clientAccount?.name ?? task.tenant?.accountName ?? null,
        column: columnFor("task", task.status),
        status: task.status,
        statusLabel: STATUS_LABEL[task.status] ?? task.status,
        priority,
        priorityRank: priorityInfo(priority).rank,
        assignee: task.assignedToUser,
        dueAt: task.dueAt?.toISOString() ?? null,
        updatedAt: task.updatedAt.toISOString(),
        comments: task._count.comments,
      };
    }),
  ];

  return items.sort((left, right) => right.priorityRank - left.priorityRank || right.updatedAt.localeCompare(left.updatedAt));
}

export type WorkspaceComment = { id: string; author: string; body: string; at: string; visibility: "INTERNAL" | "CUSTOMER" | "EVENT" };

export async function getWorkspaceItem(kind: WorkspaceKind, id: string) {
  if (kind === "ticket") {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      select: {
        id: true,
        subject: true,
        status: true,
        priority: true,
        source: true,
        aiSummary: true,
        customerName: true,
        customerContact: true,
        resolutionSummary: true,
        createdAt: true,
        updatedAt: true,
        tenant: { select: { accountName: true } },
        assignedToUser: { select: { id: true, name: true } },
        notes: { orderBy: { createdAt: "asc" }, take: 200, select: { id: true, body: true, visibility: true, createdAt: true, authorUser: { select: { name: true } } } },
        events: { orderBy: { createdAt: "asc" }, take: 200, select: { id: true, eventType: true, message: true, createdAt: true, actorUser: { select: { name: true } } } },
      },
    });
    if (!ticket) return null;
    const thread: WorkspaceComment[] = [
      ...ticket.notes.map((note) => ({
        id: `n-${note.id}`,
        author: note.authorUser?.name ?? "Equipo",
        body: note.body,
        at: note.createdAt.toISOString(),
        visibility: note.visibility as "INTERNAL" | "CUSTOMER",
      })),
      ...ticket.events
        .filter((event) => event.eventType !== "NOTE_ADDED")
        .map((event) => ({
          id: `e-${event.id}`,
          author: event.actorUser?.name ?? "Vase",
          body: event.message,
          at: event.createdAt.toISOString(),
          visibility: "EVENT" as const,
        })),
    ].sort((left, right) => left.at.localeCompare(right.at));
    return {
      kind,
      id: ticket.id,
      key: itemKey(kind, ticket.id),
      code: itemCode(kind, ticket.id),
      title: ticket.subject,
      description: ticket.aiSummary ?? "",
      status: ticket.status,
      column: columnFor(kind, ticket.status),
      priority: normalizePriority(ticket.priority),
      assignee: ticket.assignedToUser,
      client: ticket.tenant.accountName,
      facts: [
        ["Cliente", ticket.tenant.accountName],
        ["Contacto", [ticket.customerName, ticket.customerContact].filter(Boolean).join(" · ") || "—"],
        ["Origen", ticket.source === "AI_ESCALATION" ? "Lo pasó la IA" : "Cargado a mano"],
      ] as Array<[string, string]>,
      dueAt: null as string | null,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      thread,
    };
  }

  const task = await prisma.devTask.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      taskType: true,
      projectReference: true,
      dueAt: true,
      createdAt: true,
      updatedAt: true,
      tenant: { select: { accountName: true } },
      clientAccount: { select: { name: true } },
      assignedToUser: { select: { id: true, name: true } },
      createdByUser: { select: { name: true } },
      comments: { orderBy: { createdAt: "asc" }, take: 200, select: { id: true, body: true, createdAt: true, authorUser: { select: { name: true } } } },
    },
  });
  if (!task) return null;
  const client = task.clientAccount?.name ?? task.tenant?.accountName ?? null;
  return {
    kind,
    id: task.id,
    key: itemKey(kind, task.id),
    code: itemCode(kind, task.id),
    title: task.title,
    description: task.description,
    status: task.status,
    column: columnFor(kind, task.status),
    priority: normalizePriority(task.priority),
    assignee: task.assignedToUser,
    client,
    facts: [
      ["Cliente", client ?? "—"],
      ["Proyecto", task.projectReference ?? "—"],
      ["Lo cargó", task.createdByUser.name],
    ] as Array<[string, string]>,
    dueAt: task.dueAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    thread: task.comments.map((comment) => ({
      id: comment.id,
      author: comment.authorUser.name ?? "Equipo",
      body: comment.body,
      at: comment.createdAt.toISOString(),
      visibility: "INTERNAL" as const,
    })),
  };
}

export type WorkspaceItemDetail = NonNullable<Awaited<ReturnType<typeof getWorkspaceItem>>>;
