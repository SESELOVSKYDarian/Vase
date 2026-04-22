import Link from "next/link";
import type { Route } from "next";
import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardSupportWidget } from "@/components/support/dashboard-support-widget";
import { PanelCard } from "@/components/ui/panel-card";
import { StatusBadge } from "@/components/business/status-badge";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { BUSINESS_LAUNCH_PATH } from "@/lib/business/links";
import { getTenantSupportWidgetContext } from "@/server/queries/support";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";

export default async function SettingsPage() {
  let membership;

  try {
    ({ membership } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const [dashboard, supportWidget] = await Promise.all([
    getUnifiedTenantDashboard(membership.tenantId),
    getTenantSupportWidgetContext(membership.tenantId),
  ]);

  if (!dashboard) {
    forbidden();
  }

  return (
    <AppShell
      title="Configuración"
      subtitle="Administra la información base del tenant y navega a los espacios donde se configuran Business y Labs."
      tenantLabel={membership.tenant.name}
      modules={dashboard.modules}
      notifications={dashboard.notifications}
      supportWidget={
        <DashboardSupportWidget
          tenantName={membership.tenant.name}
          conversationOptions={supportWidget.conversationOptions}
          supportSummary={supportWidget.summary}
        />
      }
    >
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <PanelCard
          eyebrow="Identidad del tenant"
          title="Datos principales"
          description="Estos datos definen la base del espacio de trabajo y se reutilizan en soporte, comercial y operación."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-[var(--surface-strong)] p-5">
              <p className="text-sm text-[var(--muted)]">Nombre del negocio</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{membership.tenant.name}</p>
            </div>
            <div className="rounded-3xl bg-[var(--surface-strong)] p-5">
              <p className="text-sm text-[var(--muted)]">Cuenta</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{membership.tenant.accountName}</p>
            </div>
            <div className="rounded-3xl bg-[var(--surface-strong)] p-5">
              <p className="text-sm text-[var(--muted)]">Rubro</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{membership.tenant.industry}</p>
            </div>
            <div className="rounded-3xl bg-[var(--surface-strong)] p-5">
              <p className="text-sm text-[var(--muted)]">Producto contratado</p>
              <div className="mt-2">
                <StatusBadge tone="info" label={membership.tenant.onboardingProduct} />
              </div>
            </div>
          </div>
        </PanelCard>

        <PanelCard
          eyebrow="Navegación rápida"
          title="Entrar a configuraciones específicas"
          description="Mantienes esta misma barra lateral y desde aquí saltas a la portada de cada producto."
        >
          <div className="grid gap-3">
            <Link
              href={BUSINESS_LAUNCH_PATH as Route}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
            >
              Abrir configuración de Vase Business
            </Link>
            <Link
              href={"/app/labs" as Route}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
            >
              Abrir configuración de Vase Labs
            </Link>
            <Link
              href={"/app/owner/integrations/api" as Route}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
            >
              Revisar conexiones e integraciones
            </Link>
          </div>
        </PanelCard>
      </section>
    </AppShell>
  );
}
