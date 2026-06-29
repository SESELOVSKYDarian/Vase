import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminDevTaskAttachmentForm } from "@/components/admin/admin-dev-task-attachment-form";
import { AdminDevTaskUpdateForm } from "@/components/admin/admin-dev-task-update-form";
import { PanelCard } from "@/components/ui/panel-card";
import { AvailabilityToggle } from "@/components/internal/availability-toggle";
import { platformRoles, requireVerifiedPlatformRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export default async function DeveloperWorkspacePage() {
  let session;
  try {
    session = await requireVerifiedPlatformRole(platformRoles.DEVELOPER);
  } catch {
    forbidden();
  }

  const [tasks, profile] = await Promise.all([
    prisma.devTask.findMany({
      where: {
        assignedToUserId: session.user.id,
      },
      include: {
        attachments: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
      take: 100,
    }),
    prisma.internalUserProfile.findUnique({
      where: { userId: session.user.id },
    }),
  ]);

  return (
    <AppShell
      title="Developer Workspace"
      subtitle="Tus tareas asignadas, prioridades, fechas limite y avance operativo."
      tenantLabel={session.user.name ?? "Developer"}
    >
      <PanelCard title="Estado actual" description="Disponibilidad y resumen de carga.">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-[var(--surface-strong)] p-4 text-sm">
            <p className="mb-2">Disponibilidad: {profile?.availability ?? "OFFLINE"}</p>
            <AvailabilityToggle current={(profile?.availability as "ONLINE" | "OFFLINE" | "BUSY" | null) ?? "OFFLINE"} />
          </div>
          <div className="rounded-2xl bg-[var(--surface-strong)] p-4 text-sm">Tareas activas: {tasks.filter((task) => task.status !== "COMPLETED" && task.status !== "CANCELED").length}</div>
          <div className="rounded-2xl bg-[var(--surface-strong)] p-4 text-sm">Urgentes: {tasks.filter((task) => task.priority === "URGENT").length}</div>
        </div>
      </PanelCard>
      <PanelCard title="Mis tareas" description="Solo tareas asignadas a tu usuario.">
        <div className="grid gap-3">
          {tasks.map((task) => (
            <article key={task.id} className="rounded-2xl border border-[var(--border-subtle)] p-4">
              <p className="text-base font-semibold">{task.title}</p>
              <p className="text-sm text-[var(--muted)]">{task.description}</p>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {task.taskType} · {task.priority} · {task.status}
              </p>
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
                  developers={[]}
                />
              </div>
              <div className="mt-3">
                <AdminDevTaskAttachmentForm taskId={task.id} />
              </div>
              {task.attachments.length > 0 ? (
                <div className="mt-2 grid gap-2">
                  {task.attachments.map((attachment) => (
                    <p key={attachment.id} className="rounded-xl bg-[var(--surface-strong)] px-3 py-2 text-xs text-[var(--muted)]">
                      {attachment.fileName} · {attachment.sizeBytes} bytes
                    </p>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </PanelCard>
    </AppShell>
  );
}
