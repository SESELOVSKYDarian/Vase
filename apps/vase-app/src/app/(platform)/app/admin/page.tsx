import { forbidden } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { AdminAccessHealthChart, AdminFinanceTrendChart } from "@/components/admin/admin-dashboard-charts";
import { AdminMetricCard, AdminPageHeader, AdminSection, AdminStatusPill, adminStatusIcons } from "@/components/admin/admin-ui";
import { platformRoles, requireVerifiedPlatformRole } from "@/lib/auth/guards";
import { getMasterV2Dashboard } from "@/server/queries/v2-dashboards";
import { CalendarDays, CircleDollarSign, LifeBuoy, ShieldAlert, UserCog } from "lucide-react";

function money(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtDate(value: Date) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(value);
}

export default async function AdminPage() {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
  } catch {
    forbidden();
  }

  const dashboard = await getMasterV2Dashboard();

  return (
    <AppShell
      title="Panel Super Admin"
      subtitle="Centro de control operativo de Vase."
      tenantLabel="Admin Master"
      currentUserName="Admin Vase"
    >
      <AdminPageHeader
        eyebrow="Super Admin"
        title="Control operativo sin ruido"
        description="Mira finanzas, soporte, entregas y accesos bloqueados en una sola vista. Las alertas importantes quedan arriba para accionar rapido."
        actions={
          <>
            <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-strong)]" href="/users">
              <UserCog className="h-4 w-4" />
              Gestionar usuarios
            </Link>
            <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)] transition hover:opacity-90" href="/tickets">
              <LifeBuoy className="h-4 w-4" />
              Ver soporte
            </Link>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard label="Ganancia neta" value={money(dashboard.finances.gananciaNetaMes)} helper="Ingresos menos gastos del mes." icon={<CircleDollarSign className="h-5 w-5" />} tone={dashboard.finances.gananciaNetaMes >= 0 ? "success" : "danger"} />
        <AdminMetricCard label="Soporte abierto" value={dashboard.support.abiertos} helper={`${dashboard.support.criticos} criticos, ${dashboard.support.vencidos} vencidos.`} icon={<LifeBuoy className="h-5 w-5" />} tone={dashboard.support.criticos || dashboard.support.vencidos ? "danger" : "accent"} />
        <AdminMetricCard label="Usuarios bloqueados" value={dashboard.health.disabledUsers} helper={`${dashboard.health.tenantSuspended} tenants y ${dashboard.health.membershipSuspended} membresias suspendidas.`} icon={<ShieldAlert className="h-5 w-5" />} tone={dashboard.health.disabledUsers ? "warning" : "success"} />
        <AdminMetricCard label="Reuniones hoy" value={dashboard.meetings.hoy} helper={`${dashboard.meetings.estaSemana} reuniones programadas esta semana.`} icon={<CalendarDays className="h-5 w-5" />} tone="accent" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <AdminSection title="Tendencia financiera" description="Ingresos y gastos de los ultimos seis meses.">
          <AdminFinanceTrendChart data={dashboard.charts.financeTrend} />
        </AdminSection>
        <AdminSection title="Salud de accesos" description="Usuarios y organizaciones que requieren seguimiento.">
          <AdminAccessHealthChart data={dashboard.charts.accessHealth} />
        </AdminSection>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <AdminSection title="Finanzas" description="Estado del mes y pendientes." className="xl:col-span-1">
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl bg-[var(--surface-strong)] px-4 py-3">
              <span className="text-[var(--muted)]">Ingresos del mes</span>
              <strong className="text-[var(--foreground)]">{money(dashboard.finances.ingresosMes)}</strong>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-[var(--surface-strong)] px-4 py-3">
              <span className="text-[var(--muted)]">Gastos del mes</span>
              <strong className="text-[var(--foreground)]">{money(dashboard.finances.gastosMes)}</strong>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-[var(--surface-strong)] px-4 py-3">
              <span className="text-[var(--muted)]">Pagos vencidos</span>
              <AdminStatusPill tone={dashboard.clients.conPagosVencidos ? "warning" : "success"}>
                {dashboard.clients.conPagosVencidos}
              </AdminStatusPill>
            </div>
          </div>
        </AdminSection>

        <AdminSection title="Operaciones" description="Proyectos, entregas y agenda." className="xl:col-span-1">
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between rounded-2xl bg-[var(--surface-strong)] px-4 py-3">
              <span className="text-[var(--muted)]">Proyectos activos</span>
              <strong className="text-[var(--foreground)]">{dashboard.projects.activos}</strong>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-[var(--surface-strong)] px-4 py-3">
              <span className="text-[var(--muted)]">Entregas 7 dias</span>
              <strong className="text-[var(--foreground)]">{dashboard.projects.proximasEntregas}</strong>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-[var(--surface-strong)] px-4 py-3">
              <span className="text-[var(--muted)]">Proyectos pausados</span>
              <AdminStatusPill tone={dashboard.projects.pausados ? "warning" : "success"}>{dashboard.projects.pausados}</AdminStatusPill>
            </div>
          </div>
        </AdminSection>

        <AdminSection
          title="Accesos bloqueados"
          description="Ultimas cuentas deshabilitadas desde super admin."
          actions={
            <Link className="text-sm font-semibold text-[var(--accent-strong)] hover:underline" href="/users">
              Resolver
            </Link>
          }
        >
          <div className="grid gap-2">
            {dashboard.health.recentDisabledUsers.length ? (
              dashboard.health.recentDisabledUsers.map((user) => (
                <article key={user.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-3 py-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--foreground)]">{user.name}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{user.email}</p>
                    </div>
                    <AdminStatusPill tone="danger" icon={adminStatusIcons.danger}>Bloqueado</AdminStatusPill>
                  </div>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    {user.disabledAt ? fmtDate(user.disabledAt) : "Sin fecha"} · {user.disabledReason ?? "Sin motivo cargado"}
                  </p>
                </article>
              ))
            ) : (
              <p className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] px-4 py-6 text-center text-sm text-[var(--muted)]">
                No hay usuarios deshabilitados.
              </p>
            )}
          </div>
        </AdminSection>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <AdminSection title="Ultimos deployments" description="Publicaciones recientes de proyectos personalizados.">
          <div className="grid gap-2">
            {dashboard.deployments.ultimos.length ? (
              dashboard.deployments.ultimos.map((event) => (
                <article key={event.id} className="rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm">
                  <p className="font-semibold text-[var(--foreground)]">{event.targetId ?? "deployment"}</p>
                  <p className="text-xs text-[var(--muted)]">{fmtDate(event.createdAt)} · {event.actorUser?.name ?? "sistema"}</p>
                </article>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">Sin deployments recientes.</p>
            )}
          </div>
        </AdminSection>

        <AdminSection title="Rollbacks recientes" description="Reversiones de deployment registradas.">
          <div className="grid gap-2">
            {dashboard.deployments.rollbacksRecientes.length ? (
              dashboard.deployments.rollbacksRecientes.map((event) => (
                <article key={event.id} className="rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm">
                  <p className="font-semibold text-[var(--foreground)]">{event.targetId ?? "rollback"}</p>
                  <p className="text-xs text-[var(--muted)]">{fmtDate(event.createdAt)} · {event.actorUser?.name ?? "sistema"}</p>
                </article>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">Sin rollbacks recientes.</p>
            )}
          </div>
        </AdminSection>
      </section>
    </AppShell>
  );
}
