import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminDevTaskCreateForm } from "@/components/admin/admin-dev-task-create-form";
import { AdminDevTaskAttachmentForm } from "@/components/admin/admin-dev-task-attachment-form";
import { AdminDevTaskUpdateForm } from "@/components/admin/admin-dev-task-update-form";
import { PanelCard } from "@/components/ui/panel-card";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";

type AdminDevelopmentPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminDevelopmentPage({ searchParams }: AdminDevelopmentPageProps) {
  try {
    await requireAdminPermission(adminPermissions.USERS);
  } catch {
    forbidden();
  }

  const params = await searchParams;
  const q = getStringParam(params.q)?.trim();
  const status = getStringParam(params.status);
  const priority = getStringParam(params.priority);
  const assignedToUserId = getStringParam(params.assignedToUserId);
  const dueFilter = getStringParam(params.dueFilter);

  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [developers, tasks] = await Promise.all([
    prisma.user.findMany({
      where: {
        platformRole: "DEVELOPER",
        isDisabled: false,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.devTask.findMany({
      where: {
        ...(q
          ? {
              OR: [
                { title: { contains: q } },
                { description: { contains: q } },
                { projectReference: { contains: q } },
              ],
            }
          : {}),
        ...(status ? { status: status as "PENDING" | "IN_PROGRESS" | "IN_REVIEW" | "BLOCKED" | "COMPLETED" | "CANCELED" } : {}),
        ...(priority ? { priority: priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT" } : {}),
        ...(assignedToUserId ? { assignedToUserId } : {}),
        ...(dueFilter === "with_due" ? { dueAt: { not: null } } : {}),
        ...(dueFilter === "overdue"
          ? {
              dueAt: { lt: now },
              status: { notIn: ["COMPLETED", "CANCELED"] },
            }
          : {}),
        ...(dueFilter === "soon"
          ? {
              dueAt: { gte: now, lte: next7Days },
              status: { notIn: ["COMPLETED", "CANCELED"] },
            }
          : {}),
      },
      include: {
        assignedToUser: { select: { name: true } },
        comments: {
          include: {
            authorUser: {
              select: { name: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 3,
        },
        attachments: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }, { updatedAt: "desc" }],
      take: 120,
    }),
  ]);
  const tasksWithDueDate = tasks.filter((task) => Boolean(task.dueAt)).length;
  const hasFilters = Boolean(q || status || priority || assignedToUserId || dueFilter);

  return (
    <AppShell
      title="Tareas de Desarrollo"
      subtitle="Gestion completa de tareas: creacion, prioridad, asignacion, comentarios y seguimiento."
      tenantLabel="Admin Master"
    >
      <PanelCard title="Filtros" description="Busca por texto, estado, prioridad, developer y vencimiento.">
        <form action="/development" className="grid gap-3 md:grid-cols-6">
          <input name="q" defaultValue={q ?? ""} placeholder="Buscar tarea..." className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
          <select name="status" defaultValue={status ?? ""} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
            <option value="">Todos los estados</option>
            <option value="PENDING">Pendiente</option>
            <option value="IN_PROGRESS">En progreso</option>
            <option value="IN_REVIEW">En revisión</option>
            <option value="BLOCKED">Bloqueada</option>
            <option value="COMPLETED">Completada</option>
            <option value="CANCELED">Cancelada</option>
          </select>
          <select name="priority" defaultValue={priority ?? ""} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
            <option value="">Todas prioridades</option>
            <option value="LOW">Baja</option>
            <option value="MEDIUM">Media</option>
            <option value="HIGH">Alta</option>
            <option value="URGENT">Urgente</option>
          </select>
          <select name="assignedToUserId" defaultValue={assignedToUserId ?? ""} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
            <option value="">Todos los developers</option>
            {developers.map((developer) => (
              <option key={developer.id} value={developer.id}>
                {developer.name}
              </option>
            ))}
          </select>
          <select name="dueFilter" defaultValue={dueFilter ?? ""} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
            <option value="">Sin filtro vencimiento</option>
            <option value="with_due">Con fecha límite</option>
            <option value="overdue">Vencidas</option>
            <option value="soon">Vencen en 7 días</option>
          </select>
          <button className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-3 text-sm font-semibold text-[var(--accent-contrast)]">Aplicar</button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {q ? <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-xs">Texto: {q}</span> : null}
          {status ? <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-xs">Estado: {status}</span> : null}
          {priority ? <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-xs">Prioridad: {priority}</span> : null}
          {assignedToUserId ? (
            <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-xs">
              Developer: {developers.find((developer) => developer.id === assignedToUserId)?.name ?? "Seleccionado"}
            </span>
          ) : null}
          {dueFilter ? <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-xs">Vencimiento: {dueFilter}</span> : null}
          {hasFilters ? (
            <a href="/development" className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
              Limpiar filtros
            </a>
          ) : null}
        </div>
      </PanelCard>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <PanelCard title="Nueva tarea" description="Crea y asigna tareas operativas para developers.">
          <AdminDevTaskCreateForm developers={developers} />
        </PanelCard>

        <PanelCard title="Backlog activo" description="Vista de tareas con estado, prioridad y comentarios recientes.">
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-[var(--surface-strong)] p-3 text-sm">Total: {tasks.length}</div>
            <div className="rounded-2xl bg-[var(--surface-strong)] p-3 text-sm">Urgentes: {tasks.filter((task) => task.priority === "URGENT").length}</div>
            <div className="rounded-2xl bg-[var(--surface-strong)] p-3 text-sm">Con fecha límite: {tasksWithDueDate}</div>
            <div className="rounded-2xl bg-[var(--surface-strong)] p-3 text-sm">En progreso: {tasks.filter((task) => task.status === "IN_PROGRESS").length}</div>
          </div>
          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1">Pendientes: {tasks.filter((task) => task.status === "PENDING").length}</span>
            <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1">En revision: {tasks.filter((task) => task.status === "IN_REVIEW").length}</span>
            <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1">Bloqueadas: {tasks.filter((task) => task.status === "BLOCKED").length}</span>
            <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1">Completadas: {tasks.filter((task) => task.status === "COMPLETED").length}</span>
          </div>
          <div className="grid gap-4">
            {tasks.map((task) => (
              <article key={task.id} className="rounded-2xl border border-[var(--border-subtle)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-[var(--foreground)]">{task.title}</p>
                    <p className="text-sm text-[var(--muted)]">{task.description}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {task.taskType} · {task.priority} · {task.status} · Asignada a {task.assignedToUser?.name ?? "Sin asignar"}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <AdminDevTaskUpdateForm
                    task={{
                      id: task.id,
                      title: task.title,
                      description: task.description,
                      taskType: task.taskType,
                      priority: task.priority,
                      status: task.status,
                      assignedToUserId: task.assignedToUserId,
                      dueAt: task.dueAt,
                    }}
                    developers={developers}
                  />
                </div>
                <div className="mt-3">
                  <AdminDevTaskAttachmentForm taskId={task.id} />
                </div>
                {task.attachments.length > 0 ? (
                  <div className="mt-3 grid gap-2">
                    {task.attachments.map((attachment) => (
                      <p key={attachment.id} className="rounded-xl bg-[var(--surface-strong)] px-3 py-2 text-xs text-[var(--muted)]">
                        {attachment.fileName} · {attachment.mimeType} · {attachment.sizeBytes} bytes
                      </p>
                    ))}
                  </div>
                ) : null}
                {task.comments.length > 0 ? (
                  <div className="mt-3 grid gap-2">
                    {task.comments.map((comment) => (
                      <p key={comment.id} className="rounded-xl bg-[var(--surface-strong)] px-3 py-2 text-xs text-[var(--muted)]">
                        <span className="font-semibold text-[var(--foreground)]">{comment.authorUser.name ?? "Usuario"}:</span> {comment.body}
                      </p>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </PanelCard>
      </section>
    </AppShell>
  );
}
