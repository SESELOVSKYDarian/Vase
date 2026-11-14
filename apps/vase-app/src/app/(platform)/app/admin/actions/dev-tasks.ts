"use server";

// Tareas de desarrollo: crear y editar.
import { revalidatePath } from "next/cache";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { sanitizeNullableText, sanitizeText } from "@/lib/security/sanitize";
import { createDevTaskSchema, updateDevTaskSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { createAutoAdminNotification } from "@/server/services/admin-notifications-auto";
import { AdminGovernanceActionState, parseOptionalDate } from "./shared";

export async function createDevTaskAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const session = await requireVerifiedUser();
    if (session.user.platformRole !== "SUPER_ADMIN") {
      return { error: "Solo Admin Master puede crear tareas." };
    }
    const parsed = createDevTaskSchema.safeParse({
      title: sanitizeText(String(formData.get("title") ?? "")),
      description: sanitizeText(String(formData.get("description") ?? "")),
      tenantId: String(formData.get("tenantId") ?? "").trim() || undefined,
      clientAccountId: String(formData.get("clientAccountId") ?? "").trim() || undefined,
      projectReference: sanitizeNullableText(String(formData.get("projectReference") ?? "")) ?? undefined,
      taskType: formData.get("taskType"),
      priority: formData.get("priority"),
      status: formData.get("status"),
      assignedToUserId: String(formData.get("assignedToUserId") ?? "").trim() || undefined,
      dueAt: String(formData.get("dueAt") ?? "").trim() || undefined,
    });
    if (!parsed.success) return { error: "Datos invalidos para crear tarea." };

    const created = await prisma.devTask.create({
      data: {
        tenantId: parsed.data.tenantId ?? null,
        title: parsed.data.title,
        description: parsed.data.description,
        clientAccountId: parsed.data.clientAccountId ?? null,
        projectReference: parsed.data.projectReference ?? null,
        taskType: parsed.data.taskType,
        priority: parsed.data.priority,
        status: parsed.data.status,
        assignedToUserId: parsed.data.assignedToUserId ?? null,
        createdByUserId: session.user.id,
        dueAt: parseOptionalDate(parsed.data.dueAt),
      },
    });

    await prisma.devTaskHistory.create({
      data: {
        taskId: created.id,
        actorUserId: session.user.id,
        action: "TASK_CREATED",
        beforeJson: undefined,
        afterJson: {
          title: created.title,
          status: created.status,
          priority: created.priority,
          assignee: created.assignedToUserId,
        },
      },
    });

    await createAuditLog({
      action: "platform.dev_task_created",
      targetType: "dev_task",
      targetId: created.id,
      actorUserId: session.user.id,
      metadata: {
        after: {
          title: created.title,
          status: created.status,
          priority: created.priority,
        },
      },
    });
    await createAutoAdminNotification({
      title: "Nueva tarea asignada",
      message: `Se creÃ³ la tarea "${created.title}" con prioridad ${created.priority}.`,
      category: "platform",
      tone: created.priority === "URGENT" ? "danger" : "info",
      targetRole: created.assignedToUserId ? "DEVELOPER" : "SUPER_ADMIN",
      tenantId: created.tenantId,
    });
    revalidatePath("/app/admin/development");
    revalidatePath("/app/developer");
    return { success: "Tarea creada correctamente." };
  } catch {
    return { error: "No pudimos crear la tarea." };
  }
}

export async function updateDevTaskAction(
  _: AdminGovernanceActionState,
  formData: FormData,
): Promise<AdminGovernanceActionState> {
  try {
    const session = await requireVerifiedUser();
    const parsed = updateDevTaskSchema.safeParse({
      taskId: formData.get("taskId"),
      title: sanitizeText(String(formData.get("title") ?? "")),
      description: sanitizeText(String(formData.get("description") ?? "")),
      taskType: formData.get("taskType"),
      priority: formData.get("priority"),
      status: formData.get("status"),
      assignedToUserId: String(formData.get("assignedToUserId") ?? "").trim() || undefined,
      dueAt: String(formData.get("dueAt") ?? "").trim() || undefined,
    });
    if (!parsed.success) return { error: "Datos invalidos para actualizar tarea." };

    const current = await prisma.devTask.findUnique({
      where: { id: parsed.data.taskId },
      select: {
        assignedToUserId: true,
        status: true,
        priority: true,
        title: true,
        description: true,
        taskType: true,
        dueAt: true,
      },
    });
    if (!current) return { error: "Tarea no encontrada." };

    if (
      session.user.platformRole === "DEVELOPER" &&
      (await prisma.devTask.count({
        where: { id: parsed.data.taskId, assignedToUserId: session.user.id },
      })) === 0
    ) {
      return { error: "No puedes editar tareas no asignadas a tu usuario." };
    }

    const updated = await prisma.devTask.update({
      where: { id: parsed.data.taskId },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        taskType: parsed.data.taskType,
        priority: parsed.data.priority,
        status: parsed.data.status,
        assignedToUserId:
          session.user.platformRole === "SUPER_ADMIN" ? (parsed.data.assignedToUserId ?? null) : undefined,
        dueAt: parseOptionalDate(parsed.data.dueAt),
        completedAt: parsed.data.status === "COMPLETED" ? new Date() : null,
      },
    });

    if (
      session.user.platformRole === "SUPER_ADMIN" &&
      current.assignedToUserId !== (parsed.data.assignedToUserId ?? null)
    ) {
      await prisma.devTaskAssignmentHistory.create({
        data: {
          taskId: updated.id,
          previousUserId: current.assignedToUserId,
          nextUserId: parsed.data.assignedToUserId ?? null,
          changedByUserId: session.user.id,
        },
      });
    }

    await prisma.devTaskHistory.create({
      data: {
        taskId: updated.id,
        actorUserId: session.user.id,
        action: "TASK_UPDATED",
        beforeJson: current,
        afterJson: {
          title: updated.title,
          status: updated.status,
          priority: updated.priority,
          assignee: updated.assignedToUserId,
        },
      },
    });

    await createAuditLog({
      action: "platform.dev_task_updated",
      targetType: "dev_task",
      targetId: updated.id,
      actorUserId: session.user.id,
      metadata: {
        before: current,
        after: {
          title: updated.title,
          status: updated.status,
          priority: updated.priority,
          assignedToUserId: updated.assignedToUserId,
        },
      },
    });
    if (updated.status === "BLOCKED") {
      await createAutoAdminNotification({
        title: "Tarea bloqueada",
        message: `La tarea "${updated.title}" fue marcada como bloqueada.`,
        category: "platform",
        tone: "warning",
        targetRole: "SUPER_ADMIN",
        tenantId: updated.tenantId,
      });
    }
    if (updated.dueAt && updated.status !== "COMPLETED" && updated.status !== "CANCELED" && updated.dueAt < new Date()) {
      await createAutoAdminNotification({
        title: "Tarea vencida",
        message: `La tarea "${updated.title}" estÃ¡ vencida y sigue activa.`,
        category: "platform",
        tone: "danger",
        targetRole: "SUPER_ADMIN",
        tenantId: updated.tenantId,
      });
    }

    revalidatePath("/app/admin/development");
    revalidatePath("/app/developer");
    return { success: "Tarea actualizada." };
  } catch {
    return { error: "No pudimos actualizar la tarea." };
  }
}
