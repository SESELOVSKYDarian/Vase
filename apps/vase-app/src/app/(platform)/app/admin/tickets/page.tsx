import type { Route } from "next";
import { forbidden, redirect } from "next/navigation";
import { resolveWorkspaceUrl } from "@/lib/security/workspace-host-routing";
import { AdminSupportTicketsWorkspace } from "@/components/admin/admin-support-tickets-workspace";
import { AppShell } from "@/components/layout/app-shell";
import { Search } from "lucide-react";
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
  // Los tickets se trabajan en workspace.vase.ar. ?vista=admin deja ver la pantalla vieja por si hace falta.
  if (getStringParam(params.vista) !== "admin") redirect(resolveWorkspaceUrl("/?ver=tickets") as Route);
  const status = getStringParam(params.status);
  const priority = getStringParam(params.priority);
  const source = getStringParam(params.source);
  const assignedToUserId = getStringParam(params.assignedToUserId);
  const dueFilter = getStringParam(params.dueFilter);
  const q = getStringParam(params.q)?.trim();
  const view = getStringParam(params.view);
  const hasFilters = Boolean(q || view || status || priority || source || assignedToUserId || dueFilter);
  const OPEN = ["QUEUED", "ASSIGNED", "WAITING_CUSTOMER", "WAITING_INTERNAL"] as const;

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
        ...(view === "open" ? { status: { in: [...OPEN] } } : {}),
        ...(view === "unassigned" ? { assignedToUserId: null, status: { in: [...OPEN] } } : {}),
        ...(view === "urgent" ? { priority: { in: ["HIGH", "URGENT"] as Array<"HIGH" | "URGENT"> }, status: { in: [...OPEN] } } : {}),
        ...(view === "resolved" ? { status: { in: ["RESOLVED", "CLOSED"] as Array<"RESOLVED" | "CLOSED"> } } : {}),
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

  const views = [
    { id: "", label: "Todos" },
    { id: "open", label: "Abiertos" },
    { id: "unassigned", label: "Sin asignar" },
    { id: "urgent", label: "Urgentes" },
    { id: "resolved", label: "Resueltos" },
  ];
  const activeView = view ?? "";
  const viewHref = (id: string) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (id) next.set("view", id);
    const text = next.toString();
    return text ? `/tickets?${text}` : "/tickets";
  };

  return (
    <AppShell title="Tickets" subtitle="Lo que te piden los clientes y en qué estado está" tenantLabel="Admin">
      <div className="vpa-filt">
        <form className="vpa-search" action="/tickets" role="search">
          <Search size={16} aria-hidden="true" />
          <input className="vpa-inp" type="search" name="q" defaultValue={q ?? ""} placeholder="Buscar por asunto o cliente" aria-label="Buscar tickets" />
          {activeView ? <input type="hidden" name="view" value={activeView} /> : null}
        </form>
        <nav className="vpa-seg" aria-label="Filtrar tickets">
          {views.map((item) => (
            <a key={item.id || "all"} href={viewHref(item.id)} className={activeView === item.id ? "on" : undefined} aria-current={activeView === item.id ? "page" : undefined}>
              {item.label}
            </a>
          ))}
        </nav>
        {hasFilters ? (
          <a href="/tickets" className="vpa-btn line sm">
            Limpiar
          </a>
        ) : null}
      </div>

      <AdminSupportTicketsWorkspace tickets={tickets} agents={agents} templates={templates} />
    </AppShell>
  );
}
