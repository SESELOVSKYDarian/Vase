import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminDevTaskCreateForm } from "@/components/admin/admin-dev-task-create-form";
import { AdminDevTaskAttachmentForm } from "@/components/admin/admin-dev-task-attachment-form";
import { AdminDevTaskUpdateForm } from "@/components/admin/admin-dev-task-update-form";
import { Plus, Search } from "lucide-react";
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
  const view = getStringParam(params.view);
  const dueFilter = getStringParam(params.dueFilter) ?? (view === "overdue" || view === "soon" ? view : undefined);

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
        ...(view === "active" ? { status: { in: ["PENDING", "IN_PROGRESS", "IN_REVIEW", "BLOCKED"] as Array<"PENDING" | "IN_PROGRESS" | "IN_REVIEW" | "BLOCKED"> } } : {}),
        ...(view === "done" ? { status: "COMPLETED" as const } : {}),
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
  const hasFilters = Boolean(q || view || status || priority || assignedToUserId || dueFilter);

  const STATUS: Record<string, { label: string; tone: string }> = {
    PENDING: { label: "Pendiente", tone: "" },
    IN_PROGRESS: { label: "En curso", tone: "b" },
    IN_REVIEW: { label: "En revisión", tone: "p" },
    BLOCKED: { label: "Trabada", tone: "r" },
    COMPLETED: { label: "Terminada", tone: "g" },
    CANCELED: { label: "Cancelada", tone: "" },
  };
  const PRIORITY: Record<string, { label: string; tone: string }> = {
    LOW: { label: "Baja", tone: "" },
    MEDIUM: { label: "Media", tone: "b" },
    HIGH: { label: "Alta", tone: "y" },
    URGENT: { label: "Urgente", tone: "r" },
  };
  const views = [
    { id: "", label: "Todos" },
    { id: "active", label: "En marcha" },
    { id: "overdue", label: "Vencidos" },
    { id: "soon", label: "Vencen esta semana" },
    { id: "done", label: "Terminados" },
  ];
  const activeView = view ?? "";
  const viewHref = (id: string) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (id) next.set("view", id);
    const text = next.toString();
    return text ? `/development?${text}` : "/development";
  };
  const date = (value: Date | null) => (value ? new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(value) : "—");
  const overdue = (task: { dueAt: Date | null; status: string }) =>
    Boolean(task.dueAt && task.dueAt < now && task.status !== "COMPLETED" && task.status !== "CANCELED");

  return (
    <AppShell title="Trabajos" subtitle="Las tareas del equipo de desarrollo" tenantLabel="Admin">
      <section className="vpa-kpis" aria-label="Resumen">
        <div className="vpa-kpi"><span className="vpa-kt"><small>En curso</small><b>{tasks.filter((task) => task.status === "IN_PROGRESS").length}</b></span></div>
        <div className="vpa-kpi"><span className="vpa-kt"><small>Pendientes</small><b>{tasks.filter((task) => task.status === "PENDING").length}</b></span></div>
        <div className="vpa-kpi"><span className="vpa-kt"><small>Trabadas</small><b>{tasks.filter((task) => task.status === "BLOCKED").length}</b></span></div>
        <div className="vpa-kpi"><span className="vpa-kt"><small>Vencidas</small><b>{tasks.filter(overdue).length}</b></span></div>
      </section>

      <div className="vpa-filt">
        <form className="vpa-search" action="/development" role="search">
          <Search size={16} aria-hidden="true" />
          <input className="vpa-inp" type="search" name="q" defaultValue={q ?? ""} placeholder="Buscar un trabajo" aria-label="Buscar trabajos" />
          {activeView ? <input type="hidden" name="view" value={activeView} /> : null}
        </form>
        <nav className="vpa-seg" aria-label="Filtrar trabajos">
          {views.map((item) => (
            <a key={item.id || "all"} href={viewHref(item.id)} className={activeView === item.id ? "on" : undefined} aria-current={activeView === item.id ? "page" : undefined}>
              {item.label}
            </a>
          ))}
        </nav>
        {hasFilters ? (
          <a href="/development" className="vpa-btn line sm">
            Limpiar
          </a>
        ) : null}
      </div>

      <details className="vpa-card" style={{ padding: 0 }}>
        <summary style={{ padding: "16px 20px", cursor: "pointer", listStyle: "none" }}>
          <span className="vpa-btn acc sm" style={{ pointerEvents: "none" }}>
            <Plus size={14} aria-hidden="true" />
            Nuevo trabajo
          </span>
        </summary>
        <div style={{ padding: "0 20px 20px" }}>
          <AdminDevTaskCreateForm developers={developers} />
        </div>
      </details>

      {tasks.length === 0 ? <div className="vpa-empty">No hay trabajos con este filtro.</div> : null}
      <div className="vpa-stack">
        {tasks.map((task) => (
          <details key={task.id} className="vpa-card" style={{ padding: 0 }}>
            <summary style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "14px 20px", cursor: "pointer", listStyle: "none" }}>
              <div className="vpa-g1">
                <b>{task.title}</b>
                <span>
                  {task.assignedToUser?.name ?? "Sin asignar"}
                  {task.dueAt ? ` · vence ${date(task.dueAt)}` : ""}
                  {task.projectReference ? ` · ${task.projectReference}` : ""}
                </span>
              </div>
              <span className={`vpa-tag ${PRIORITY[task.priority]?.tone ?? ""}`}>
                <i />
                {PRIORITY[task.priority]?.label ?? task.priority}
              </span>
              <span className={`vpa-tag ${overdue(task) ? "r" : (STATUS[task.status]?.tone ?? "")}`}>
                <i />
                {overdue(task) ? "Vencida" : (STATUS[task.status]?.label ?? task.status)}
              </span>
            </summary>
            <div className="vpa-stack" style={{ padding: "0 20px 20px" }}>
              {task.description ? (
                <p className="vpa-mut" style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                  {task.description}
                </p>
              ) : null}
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
              <AdminDevTaskAttachmentForm taskId={task.id} />
              {task.attachments.length > 0 ? (
                <ul className="vpa-mut" style={{ margin: 0, paddingLeft: 18, fontSize: 12, display: "grid", gap: 4 }}>
                  {task.attachments.map((attachment) => (
                    <li key={attachment.id}>
                      {attachment.fileName} · {Math.max(1, Math.round(attachment.sizeBytes / 1024))} KB
                    </li>
                  ))}
                </ul>
              ) : null}
              {task.comments.length > 0 ? (
                <div style={{ display: "grid", gap: 6 }}>
                  <div className="vpa-lab" style={{ marginBottom: 0 }}>Comentarios</div>
                  {task.comments.map((comment) => (
                    <p key={comment.id} className="vpa-mut" style={{ margin: 0, fontSize: 12.5 }}>
                      <b style={{ color: "var(--tx)" }}>{comment.authorUser.name ?? "Usuario"}:</b> {comment.body}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </AppShell>
  );
}
