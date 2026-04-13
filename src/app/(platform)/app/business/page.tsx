import Link from "next/link";
import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardSupportWidget } from "@/components/support/dashboard-support-widget";
import { PanelCard } from "@/components/ui/panel-card";
import { MetricCard } from "@/components/business/metric-card";
import { StatusBadge } from "@/components/business/status-badge";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { getBillingLabel, getPlanLabel } from "@/lib/business/plans";
import { getBusinessOwnerDashboard, getUnifiedTenantDashboard } from "@/server/queries/dashboard";
import { getTenantSupportWidgetContext } from "@/server/queries/support";

export default async function BusinessPage() {
  let membership;

  try {
    ({ membership } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const [businessDashboard, rootDashboard, supportWidget] = await Promise.all([
    getBusinessOwnerDashboard(membership.tenantId),
    getUnifiedTenantDashboard(membership.tenantId),
    getTenantSupportWidgetContext(membership.tenantId),
  ]);

  if (!rootDashboard) {
    forbidden();
  }

  return (
    <AppShell
      title="Vase Business"
      subtitle="Portada operativa de tu ecommerce y presencia online dentro del panel general de Vase."
      tenantLabel={membership.tenant.name}
      modules={rootDashboard.modules}
      notifications={rootDashboard.notifications}
      supportWidget={
        <DashboardSupportWidget
          tenantName={membership.tenant.name}
          conversationOptions={supportWidget.conversationOptions}
          supportSummary={supportWidget.summary}
        />
      }
    >
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Páginas" value={businessDashboard.summary.totalPages} note="Sitios creados dentro del tenant." />
        <MetricCard label="Activas" value={businessDashboard.summary.activePages} note="Páginas visibles o en operación." />
        <MetricCard label="Dominios conectados" value={businessDashboard.summary.connectedDomains} note="Dominios listos para producción." />
        <MetricCard label="Integraciones" value={businessDashboard.featureFlags.filter((flag) => flag.enabled).length} note="Flags o integraciones habilitadas." />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <PanelCard
          eyebrow="Estado comercial"
          title="Plan de Vase Business"
          description="Resumen rápido del plan, la facturación y los límites principales del módulo."
          actions={<StatusBadge tone="info" label={getPlanLabel(businessDashboard.plan.plan)} />}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-[var(--surface-strong)] p-5">
              <p className="text-sm text-[var(--muted)]">Facturación</p>
              <div className="mt-2">
                <StatusBadge tone="info" label={getBillingLabel(businessDashboard.plan.billingStatus)} />
              </div>
            </div>
            <div className="rounded-3xl bg-[var(--surface-strong)] p-5">
              <p className="text-sm text-[var(--muted)]">Límite de páginas</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                {businessDashboard.plan.limits.maxPages}
              </p>
            </div>
          </div>
        </PanelCard>

        <PanelCard
          eyebrow="Siguiente paso"
          title="Gestión avanzada"
          description="Si quieres editar páginas, dominios, presupuestos o integraciones, entra al espacio operativo completo."
        >
          <Link
            href="/app/owner"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
          >
            Abrir gestión avanzada de Business
          </Link>
        </PanelCard>
      </section>
    </AppShell>
  );
}
