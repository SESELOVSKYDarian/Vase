import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PanelCard } from "@/components/ui/panel-card";
import { platformRoles, requireVerifiedPlatformRole } from "@/lib/auth/guards";
import { getMasterV2Dashboard } from "@/server/queries/v2-dashboards";

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
      title="Inicio Super Admin"
      subtitle="Vista consolidada de finanzas, proyectos, soporte y deployments."
      tenantLabel="Admin Master"
      currentUserName="Admin Vase"
    >
      <section className="grid gap-4 md:grid-cols-3">
        <PanelCard title="Ingresos del mes" description="Cobros registrados en el mes actual.">
          <p className="text-3xl font-semibold text-[var(--foreground)]">{money(dashboard.finances.ingresosMes)}</p>
        </PanelCard>
        <PanelCard title="Gastos del mes" description="Egresos registrados en el mes actual.">
          <p className="text-3xl font-semibold text-[var(--foreground)]">{money(dashboard.finances.gastosMes)}</p>
        </PanelCard>
        <PanelCard title="Ganancia neta" description="Ingresos menos gastos del mes.">
          <p className={`text-3xl font-semibold ${dashboard.finances.gananciaNetaMes >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
            {money(dashboard.finances.gananciaNetaMes)}
          </p>
        </PanelCard>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <PanelCard title="Proyectos activos" description="Descubrimiento, diseno, desarrollo, testing o deployment.">
          <p className="text-3xl font-semibold text-[var(--foreground)]">{dashboard.projects.activos}</p>
        </PanelCard>
        <PanelCard title="Soporte abierto" description="Tickets en cola/asignados/en espera.">
          <p className="text-3xl font-semibold text-[var(--foreground)]">{dashboard.support.abiertos}</p>
        </PanelCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <PanelCard title="Finanzas operativas" description="Pendientes de hosting/mantenimiento y ganancia anual.">
          <div className="grid gap-2 text-sm text-[var(--muted)]">
            <p>
              Ganancia anual parcial: <span className="font-semibold text-[var(--foreground)]">{money(dashboard.finances.gananciaAnual)}</span>
            </p>
            <p>
              Hosting pendiente: <span className="font-semibold text-[var(--foreground)]">{dashboard.finances.hostingPendiente}</span>
            </p>
            <p>
              Mantenimiento pendiente:{" "}
              <span className="font-semibold text-[var(--foreground)]">{dashboard.finances.mantenimientoPendiente}</span>
            </p>
          </div>
        </PanelCard>

        <PanelCard title="Proyectos" description="Estado general y proximas entregas.">
          <div className="grid gap-2 text-sm text-[var(--muted)]">
            <p>
              Finalizados: <span className="font-semibold text-[var(--foreground)]">{dashboard.projects.finalizados}</span>
            </p>
            <p>
              Pausados: <span className="font-semibold text-[var(--foreground)]">{dashboard.projects.pausados}</span>
            </p>
            <p>
              Proximas entregas (7 dias):{" "}
              <span className="font-semibold text-[var(--foreground)]">{dashboard.projects.proximasEntregas}</span>
            </p>
          </div>
        </PanelCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <PanelCard title="Soporte" description="Salud de la operacion de tickets.">
          <div className="grid gap-2 text-sm text-[var(--muted)]">
            <p>
              Vencidos: <span className="font-semibold text-[var(--foreground)]">{dashboard.support.vencidos}</span>
            </p>
            <p>
              Criticos: <span className="font-semibold text-[var(--foreground)]">{dashboard.support.criticos}</span>
            </p>
            <p>
              Esperando cliente:{" "}
              <span className="font-semibold text-[var(--foreground)]">{dashboard.support.esperandoCliente}</span>
            </p>
          </div>
        </PanelCard>

        <PanelCard title="Reuniones" description="Agenda inmediata y actividad reciente.">
          <div className="grid gap-2 text-sm text-[var(--muted)]">
            <p>
              Reuniones hoy: <span className="font-semibold text-[var(--foreground)]">{dashboard.meetings.hoy}</span>
            </p>
            <p>
              Reuniones esta semana:{" "}
              <span className="font-semibold text-[var(--foreground)]">{dashboard.meetings.estaSemana}</span>
            </p>
          </div>
        </PanelCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <PanelCard title="Ultimos deployments" description="Publicaciones recientes de proyectos personalizados.">
          <div className="grid gap-2">
            {dashboard.deployments.ultimos.length ? (
              dashboard.deployments.ultimos.map((event) => (
                <article key={event.id} className="rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm">
                  <p className="font-semibold text-[var(--foreground)]">{event.targetId ?? "deployment"}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {fmtDate(event.createdAt)} | {event.actorUser?.name ?? "sistema"}
                  </p>
                </article>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">Sin deployments recientes.</p>
            )}
          </div>
        </PanelCard>

        <PanelCard title="Rollbacks recientes" description="Reversiones de deployment registradas.">
          <div className="grid gap-2">
            {dashboard.deployments.rollbacksRecientes.length ? (
              dashboard.deployments.rollbacksRecientes.map((event) => (
                <article key={event.id} className="rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm">
                  <p className="font-semibold text-[var(--foreground)]">{event.targetId ?? "rollback"}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {fmtDate(event.createdAt)} | {event.actorUser?.name ?? "sistema"}
                  </p>
                </article>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">Sin rollbacks recientes.</p>
            )}
          </div>
        </PanelCard>
      </section>
    </AppShell>
  );
}
