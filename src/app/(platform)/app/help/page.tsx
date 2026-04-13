import Link from "next/link";
import type { Route } from "next";
import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardSupportWidget } from "@/components/support/dashboard-support-widget";
import { ClientSupportTicketForm } from "@/components/support/client-support-ticket-form";
import { PanelCard } from "@/components/ui/panel-card";
import { StatusBadge } from "@/components/business/status-badge";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { getSupportPriorityLabel, getSupportPriorityTone, getSupportStatusLabel, getSupportTicketTone } from "@/lib/support/tickets";
import { getTenantSupportOverview, getTenantSupportWidgetContext } from "@/server/queries/support";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";

export default async function HelpPage() {
  let membership;

  try {
    ({ membership } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const [dashboard, supportOverview, supportWidget] = await Promise.all([
    getUnifiedTenantDashboard(membership.tenantId),
    getTenantSupportOverview(membership.tenantId),
    getTenantSupportWidgetContext(membership.tenantId),
  ]);

  if (!dashboard) {
    forbidden();
  }

  return (
    <AppShell
      title="Ayuda"
      subtitle="Centro de ayuda del cliente para abrir tickets, seguir casos activos y acceder a respuestas rápidas sin salir del panel."
      tenantLabel={membership.tenant.name}
      notifications={dashboard.notifications}
      supportWidget={
        <DashboardSupportWidget
          tenantName={membership.tenant.name}
          conversationOptions={supportWidget.conversationOptions}
          supportSummary={supportWidget.summary}
        />
      }
    >
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <PanelCard
          eyebrow="Centro de ayuda"
          title="Abrir un ticket humano"
          description="Cuando la asistencia automática no alcanza, el equipo de Vase puede tomar el caso desde aquí."
        >
          <ClientSupportTicketForm conversationOptions={supportWidget.conversationOptions} />
        </PanelCard>

        <PanelCard
          eyebrow="Recursos rápidos"
          title="Atajos útiles"
          description="Accesos directos para resolver lo más frecuente sin perder tiempo."
        >
          <div className="grid gap-3">
            <Link
              href={"/app/billing" as Route}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
            >
              Revisar planes y facturación
            </Link>
            <Link
              href={"/app/settings" as Route}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
            >
              Ir a configuración del tenant
            </Link>
            <Link
              href={"/politica-de-privacidad" as Route}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
            >
              Política de privacidad
            </Link>
          </div>
        </PanelCard>
      </section>

      <PanelCard
        eyebrow="Estado del soporte"
        title="Tickets recientes"
        description="Aquí ves el historial más reciente del tenant con prioridad, estado y asignación."
      >
        <div className="grid gap-4">
          {supportOverview.tickets.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-strong)] p-5 text-sm leading-6 text-[var(--muted)]">
              Todavía no hay tickets para este tenant.
            </div>
          ) : (
            supportOverview.tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-[var(--foreground)]">{ticket.subject}</p>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      {ticket.aiSummary ?? "Sin contexto adicional cargado."}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone={getSupportTicketTone(ticket.status)} label={getSupportStatusLabel(ticket.status)} />
                    <StatusBadge tone={getSupportPriorityTone(ticket.priority)} label={getSupportPriorityLabel(ticket.priority)} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </PanelCard>
    </AppShell>
  );
}
