import Link from "next/link";
import type { Route } from "next";
import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardSupportWidget } from "@/components/support/dashboard-support-widget";
import { PanelCard } from "@/components/ui/panel-card";
import { StatusBadge } from "@/components/business/status-badge";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { getBillingLabel, getPlanLabel } from "@/lib/business/plans";
import { getTenantModulesAccess } from "@/server/queries/modules";
import { getTenantSupportWidgetContext } from "@/server/queries/support";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";
import { prisma } from "@/lib/db/prisma";

function formatMoney(amount: number | null | undefined, currency = "ARS") {
  if (amount == null) {
    return "A medida";
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Sin fecha definida";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
  }).format(value);
}

export default async function BillingPage() {
  let membership;

  try {
    ({ membership } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const [dashboard, modulesAccess, supportWidget, subscription, tenant] = await Promise.all([
    getUnifiedTenantDashboard(membership.tenantId),
    getTenantModulesAccess(membership.tenantId),
    getTenantSupportWidgetContext(membership.tenantId),
    prisma.tenantSubscription.findUnique({
      where: { tenantId: membership.tenantId },
    }),
    prisma.tenant.findUnique({
      where: { id: membership.tenantId },
      select: {
        createdAt: true,
        billingEmail: true,
      },
    }),
  ]);

  if (!dashboard || !modulesAccess) {
    forbidden();
  }

  const labsModule = modulesAccess.modules.find((module) => module.key === "labs");

  const hostingRenewal = tenant ? new Date(tenant.createdAt.getTime()) : null;
  if (hostingRenewal) {
    hostingRenewal.setFullYear(hostingRenewal.getFullYear() + 1);
  }

  return (
    <AppShell
      title="Planes y facturación"
      subtitle="Consulta el estado comercial del tenant, vencimientos estimados y lo que hoy está contratado en Vase."
      tenantLabel={membership.tenant.name}
      modules={modulesAccess.modules}
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
          eyebrow="Estado actual"
          title="Resumen de facturación"
          description="Este bloque unifica el estado de Business, Labs y el próximo hito comercial del tenant."
          actions={
            <StatusBadge
              tone={subscription?.billingStatus === "PAST_DUE" ? "warning" : "info"}
              label={getBillingLabel(subscription?.billingStatus ?? "TRIAL")}
            />
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-[var(--surface-strong)] p-5">
              <p className="text-sm text-[var(--muted)]">Plan Business</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                {getPlanLabel(subscription?.plan ?? "START")}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                Hosting estimado hasta {formatDate(hostingRenewal)}.
              </p>
            </div>
            <div className="rounded-3xl bg-[var(--surface-strong)] p-5">
              <p className="text-sm text-[var(--muted)]">Vase Labs</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                {labsModule?.isActive ? "Activo" : "No contratado"}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                Próximo vencimiento: {formatDate(subscription?.currentPeriodEndsAt ?? null)}.
              </p>
            </div>
          </div>
        </PanelCard>

        <PanelCard
          eyebrow="Canal administrativo"
          title="Datos de cobranza"
          description="Estos datos se usan para avisos operativos, verificación de pagos y contacto comercial."
        >
          <div className="grid gap-4">
            <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5">
              <p className="text-sm text-[var(--muted)]">Email de facturación</p>
              <p className="mt-2 text-base font-semibold text-[var(--foreground)]">
                {tenant?.billingEmail ?? membership.tenant.name}
              </p>
            </div>
            <Link
              href="/precios"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
            >
              Ver tabla pública de planes
            </Link>
          </div>
        </PanelCard>
      </section>

      <PanelCard
        eyebrow="Productos contratados"
        title="Catálogo activo del tenant"
        description="El pricing visible se toma del backend y deja preparada la base para renovaciones y upgrades."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {modulesAccess.modules.map((module) => (
            <div
              key={module.id}
              className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-[var(--foreground)]">{module.name}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{module.description}</p>
                </div>
                <StatusBadge tone={module.isActive ? "success" : "neutral"} label={module.statusLabel} />
              </div>
              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">Precio base</p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
                    {module.billing.type === "monthly"
                      ? `${formatMoney(module.billing.monthlyFrom, module.billing.currency)} / mes`
                      : formatMoney(module.billing.setupFrom, module.billing.currency)}
                  </p>
                </div>
                <Link
                  href={(module.isActive ? module.route : module.activationRoute) as Route}
                  className="inline-flex min-h-11 items-center rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
                >
                  {module.isActive ? "Abrir módulo" : "Ver contratación"}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </PanelCard>
    </AppShell>
  );
}
