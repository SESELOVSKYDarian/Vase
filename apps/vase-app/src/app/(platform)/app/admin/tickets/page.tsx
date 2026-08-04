import { forbidden } from "next/navigation";
import { AdminSupportTicketsWorkspace } from "@/components/admin/admin-support-tickets-workspace";
import { AppShell } from "@/components/layout/app-shell";
import { PanelCard } from "@/components/ui/panel-card";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";

type AdminTicketsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminTicketsPage({ searchParams }: AdminTicketsPageProps) {
  try {
    await requireAdminPermission(adminPermissions.USERS);
  } catch {
    forbidden();
  }

  const params = await searchParams;
  const status = getStringParam(params.status);
  const priority = getStringParam(params.priority);
  const source = getStringParam(params.source);
  const assignedToUserId = getStringParam(params.assignedToUserId);
  const dueFilter = getStringParam(params.dueFilter);
  const q = getStringParam(params.q)?.trim();
  const hasFilters = Boolean(q || status || priority || source || assignedToUserId || dueFilter);

  const [tickets, agents, templates] = await Promise.all([
    prisma.supportTicket.findMany({
      where: {
        ...(status
          ? { status: status as "QUEUED" | "ASSIGNED" | "WAITING_CUSTOMER" | "WAITING_INTERNAL" | "RESOLVED" | "RETURNED_TO_AI" | "CLOSED" }
          : {}),
        ...(priority ? { priority: priority as "LOW" | "NORMAL" | "HIGH" | "URGENT" } : {}),
        ...(source ? { source: source as "AI_ESCALATION" | "MANUAL" } : {}),
        ...(assignedToUserId === "unassigned"
          ? { assignedToUserId: null }
          : assignedToUserId
            ? { assignedToUserId }
            : {}),
        ...(dueFilter === "overdue"
          ? {
              status: { in: ["QUEUED", "ASSIGNED", "WAITING_CUSTOMER", "WAITING_INTERNAL"] },
            }
          : {}),
        ...(q
          ? {
              OR: [{ subject: { contains: q } }, { customerName: { contains: q } }, { customerContact: { contains: q } }],
            }
          : {}),
      },
      include: {
        tenant: { select: { accountName: true } },
        assignedToUser: { select: { name: true } },
        assignees: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
        notes: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            authorUser: {
              select: {
                name: true,
                platformRole: true,
              },
            },
          },
        },
        events: {
          orderBy: { createdAt: "desc" },
          take: 25,
          include: {
            actorUser: {
              select: {
                name: true,
                platformRole: true,
              },
            },
          },
        },
        attachments: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        subtasks: {
          orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
          take: 40,
        },
        worklogs: {
          orderBy: { createdAt: "desc" },
          take: 30,
          include: {
            actorUser: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
      take: 120,
    }),
    prisma.user.findMany({
      where: { platformRole: { in: ["SUPPORT", "SUPER_ADMIN"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.supportReplyTemplate.findMany({
      where: { isActive: true },
      select: { id: true, name: true, body: true },
      orderBy: { name: "asc" },
      take: 50,
    }),
  ]);

  return (
    <AppShell
      title="Tickets de Soporte"
      subtitle="Vista operativa admin para seguimiento, reasignacion y resolucion de tickets."
      tenantLabel="Admin Master"
    >
      <PanelCard title="Filtros" description="Filtra por estado, prioridad, origen, agente, vencimiento o texto libre.">
        <form action="/tickets" className="grid gap-3 md:grid-cols-7">
          <input name="q" defaultValue={q ?? ""} placeholder="Buscar ticket..." className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm" />
          <select name="status" defaultValue={status ?? ""} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
            <option value="">Todos los estados</option>
            <option value="QUEUED">Nuevo/Cola</option>
            <option value="ASSIGNED">Asignado</option>
            <option value="WAITING_CUSTOMER">Esperando cliente</option>
            <option value="WAITING_INTERNAL">Esperando interno</option>
            <option value="RESOLVED">Resuelto</option>
            <option value="CLOSED">Cerrado</option>
          </select>
          <select name="priority" defaultValue={priority ?? ""} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
            <option value="">Todas prioridades</option>
            <option value="LOW">Baja</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">Alta</option>
            <option value="URGENT">Urgente</option>
          </select>
          <select name="source" defaultValue={source ?? ""} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
            <option value="">Todos los origenes</option>
            <option value="AI_ESCALATION">Cola/IA</option>
            <option value="MANUAL">Manual</option>
          </select>
          <select name="assignedToUserId" defaultValue={assignedToUserId ?? ""} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
            <option value="">Todos los agentes</option>
            <option value="unassigned">Sin asignar</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
          <select name="dueFilter" defaultValue={dueFilter ?? ""} className="min-h-10 rounded-xl border border-[var(--border-subtle)] bg-transparent px-3 text-sm">
            <option value="">Sin filtro de demora</option>
            <option value="overdue">En espera activa</option>
          </select>
          <button className="min-h-10 rounded-xl bg-[var(--accent-strong)] px-3 text-sm font-semibold text-[var(--accent-contrast)]">Aplicar</button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {q ? <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-xs">Texto: {q}</span> : null}
          {status ? <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-xs">Estado: {status}</span> : null}
          {priority ? <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-xs">Prioridad: {priority}</span> : null}
          {source ? <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-xs">Origen: {source}</span> : null}
          {assignedToUserId ? (
            <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-xs">
              Agente: {assignedToUserId === "unassigned" ? "Sin asignar" : (agents.find((agent) => agent.id === assignedToUserId)?.name ?? "Seleccionado")}
            </span>
          ) : null}
          {dueFilter ? <span className="rounded-full bg-[var(--surface-strong)] px-3 py-1 text-xs">Demora: {dueFilter}</span> : null}
          {hasFilters ? (
            <a href="/tickets" className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
              Limpiar filtros
            </a>
          ) : null}
        </div>
      </PanelCard>

      <AdminSupportTicketsWorkspace tickets={tickets} agents={agents} templates={templates} />
    </AppShell>
  );
}
