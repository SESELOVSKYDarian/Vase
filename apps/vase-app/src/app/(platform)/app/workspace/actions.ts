"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { sanitizeText } from "@/lib/security/sanitize";
import { isWorkspaceRole } from "@/lib/security/workspace-host-routing";
import {
  TASK_STATUS_FOR,
  TICKET_STATUS_FOR,
  isWorkspaceColumn,
  normalizePriority,
  parseItemKey,
  priorityFor,
  type WorkspaceColumn,
  type WorkspacePriority,
} from "@/lib/workspace/board";
import { createAuditLog } from "@/server/services/audit-log";
import { addSupportTicketNote, assignSupportTicket, sendSupportReply, updateSupportTicketLifecycle } from "@/server/services/support";

export type WorkspaceActionResult = { ok: boolean; message?: string };

async function requireTeam() {
  const session = await auth();
  if (!session?.user?.id || !session.user.isEmailVerified || !isWorkspaceRole(session.user.platformRole)) {
    throw new Error("FORBIDDEN");
  }
  return { id: session.user.id, role: session.user.platformRole as "SUPER_ADMIN" | "SUPPORT" | "DEVELOPER" };
}

/** Quién puede tocar qué: soporte y admin los tickets; admin todos los trabajos; desarrollo los suyos. */
async function canEdit(user: { id: string; role: string }, kind: "ticket" | "task", id: string) {
  if (user.role === "SUPER_ADMIN") return true;
  if (kind === "ticket") return user.role === "SUPPORT";
  if (user.role === "SUPPORT") return false;
  return (await prisma.devTask.count({ where: { id, assignedToUserId: user.id } })) > 0;
}

function done() {
  revalidatePath("/app/workspace", "layout");
}

async function guard(key: string) {
  const user = await requireTeam().catch(() => null);
  if (!user) return { error: "No tenés permiso para esto." } as const;
  const parsed = parseItemKey(key);
  if (!parsed) return { error: "No encontramos esa tarjeta." } as const;
  if (!(await canEdit(user, parsed.kind, parsed.id))) return { error: "No podés cambiar esta tarjeta." } as const;
  return { user, ...parsed } as const;
}

export async function moveWorkspaceItemAction(key: string, column: WorkspaceColumn): Promise<WorkspaceActionResult> {
  if (!isWorkspaceColumn(column)) return { ok: false, message: "Columna inválida." };
  const ctx = await guard(key);
  if ("error" in ctx) return { ok: false, message: ctx.error };

  if (ctx.kind === "ticket") {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ctx.id }, select: { priority: true } });
    if (!ticket) return { ok: false, message: "No encontramos ese ticket." };
    await updateSupportTicketLifecycle({ ticketId: ctx.id, actorUserId: ctx.user.id, status: TICKET_STATUS_FOR[column], priority: ticket.priority });
  } else {
    const before = await prisma.devTask.findUnique({ where: { id: ctx.id }, select: { status: true } });
    if (!before) return { ok: false, message: "No encontramos ese trabajo." };
    const status = TASK_STATUS_FOR[column];
    await prisma.devTask.update({ where: { id: ctx.id }, data: { status, completedAt: status === "COMPLETED" ? new Date() : null } });
    await prisma.devTaskHistory.create({
      data: { taskId: ctx.id, actorUserId: ctx.user.id, action: "TASK_MOVED", beforeJson: { status: before.status }, afterJson: { status } },
    });
  }
  done();
  return { ok: true };
}

export async function setWorkspacePriorityAction(key: string, value: WorkspacePriority): Promise<WorkspaceActionResult> {
  const priority = normalizePriority(value);
  const ctx = await guard(key);
  if ("error" in ctx) return { ok: false, message: ctx.error };

  if (ctx.kind === "ticket") {
    const ticket = await prisma.supportTicket.findUnique({ where: { id: ctx.id }, select: { status: true } });
    if (!ticket) return { ok: false, message: "No encontramos ese ticket." };
    await updateSupportTicketLifecycle({
      ticketId: ctx.id,
      actorUserId: ctx.user.id,
      status: ticket.status,
      priority: priorityFor("ticket", priority) as "LOW" | "NORMAL" | "HIGH" | "URGENT",
    });
  } else {
    await prisma.devTask.update({ where: { id: ctx.id }, data: { priority: priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT" } });
    await prisma.devTaskHistory.create({ data: { taskId: ctx.id, actorUserId: ctx.user.id, action: "TASK_PRIORITY", afterJson: { priority } } });
  }
  done();
  return { ok: true };
}

export async function assignWorkspaceItemAction(key: string, userId: string): Promise<WorkspaceActionResult> {
  const ctx = await guard(key);
  if ("error" in ctx) return { ok: false, message: ctx.error };
  if (ctx.user.role === "DEVELOPER") return { ok: false, message: "Solo admin y soporte reparten el trabajo." };
  const target = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true, platformRole: true } }) : null;
  if (userId && (!target || !isWorkspaceRole(target.platformRole))) return { ok: false, message: "Esa persona no es del equipo." };

  if (ctx.kind === "ticket") {
    if (target) {
      await assignSupportTicket({ ticketId: ctx.id, actorUserId: ctx.user.id, assignedToUserId: target.id, assignmentMode: "MANUAL" });
    } else {
      await prisma.supportTicket.update({ where: { id: ctx.id }, data: { assignedToUserId: null } });
    }
  } else {
    const before = await prisma.devTask.findUnique({ where: { id: ctx.id }, select: { assignedToUserId: true } });
    await prisma.devTask.update({ where: { id: ctx.id }, data: { assignedToUserId: target?.id ?? null } });
    await prisma.devTaskAssignmentHistory.create({
      data: { taskId: ctx.id, previousUserId: before?.assignedToUserId ?? null, nextUserId: target?.id ?? null, changedByUserId: ctx.user.id },
    });
  }
  done();
  return { ok: true };
}

/** Comentario. En un ticket puede ser interno o una respuesta que ve el cliente. */
export async function commentWorkspaceItemAction(key: string, rawBody: string, toCustomer: boolean): Promise<WorkspaceActionResult> {
  const body = sanitizeText(String(rawBody ?? "")).trim().slice(0, 5000);
  if (body.length < 2) return { ok: false, message: "Escribí algo." };
  const user = await requireTeam().catch(() => null);
  if (!user) return { ok: false, message: "No tenés permiso para esto." };
  const parsed = parseItemKey(key);
  if (!parsed) return { ok: false, message: "No encontramos esa tarjeta." };

  if (parsed.kind === "ticket") {
    if (toCustomer && user.role === "DEVELOPER") return { ok: false, message: "Las respuestas al cliente las manda soporte." };
    await addSupportTicketNote(parsed.id, user.id, body, toCustomer ? "CUSTOMER" : "INTERNAL");
    if (toCustomer) await sendSupportReply({ ticketId: parsed.id, actorUserId: user.id, body });
  } else {
    await prisma.devTaskComment.create({ data: { taskId: parsed.id, authorUserId: user.id, body } });
  }
  done();
  return { ok: true };
}

export async function createWorkspaceTaskAction(input: { title: string; description: string; priority: WorkspacePriority; assigneeId: string }): Promise<WorkspaceActionResult & { key?: string }> {
  const user = await requireTeam().catch(() => null);
  if (!user || user.role === "DEVELOPER") return { ok: false, message: "Solo admin y soporte cargan trabajos nuevos." };
  const title = sanitizeText(String(input.title ?? "")).trim().slice(0, 190);
  if (title.length < 3) return { ok: false, message: "Poné un título." };
  const assignee = input.assigneeId ? await prisma.user.findUnique({ where: { id: input.assigneeId }, select: { id: true, platformRole: true } }) : null;

  const task = await prisma.devTask.create({
    data: {
      title,
      description: sanitizeText(String(input.description ?? "")).trim().slice(0, 10000),
      priority: normalizePriority(input.priority) as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      assignedToUserId: assignee && isWorkspaceRole(assignee.platformRole) ? assignee.id : null,
      createdByUserId: user.id,
    },
    select: { id: true },
  });
  await createAuditLog({ action: "workspace.task_created", targetType: "dev_task", targetId: task.id, actorUserId: user.id, metadata: { title } });
  done();
  return { ok: true, key: `D-${task.id}` };
}
