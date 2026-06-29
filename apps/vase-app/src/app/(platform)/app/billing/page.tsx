import Link from "next/link";
import type { Route } from "next";
import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PanelCard } from "@/components/ui/panel-card";
import { StatusBadge } from "@/components/business/status-badge";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { getBillingLabel, getPlanLabel } from "@/lib/business/plans";
import { getTenantModulesAccess } from "@/server/queries/modules";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";
import { prisma } from "@/lib/db/prisma";

function formatMoney(amount: number | null | undefined, currency = "ARS") {
  if (amount == null) return "A medida";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: Date | null) {
  if (!value) return "Sin fecha definida";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(value);
}

export default async function BillingPage() {
  let membership;
  let session;

  try {
    ({ membership, session } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const [dashboard, modulesAccess, subscription, tenant, invoices] = await Promise.all([
    getUnifiedTenantDashboard(membership.tenantId, session.user.id, session.user.platformRole),
    getTenantModulesAccess(membership.tenantId, session.user.id),
    prisma.tenantSubscription.findUnique({
      where: { tenantId: membership.tenantId },
    }),
    prisma.tenant.findUnique({
      where: { id: membership.tenantId },
      select: { createdAt: true, billingEmail: true },
    }),
    prisma.clientPayment.findMany({
      where: { tenantId: membership.tenantId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        concept: true,
        category: true,
        status: true,
        totalAmount: true,
        paidAmount: true,
        dueAt: true,
        paidAt: true,
        createdAt: true,
      },
    }),
  ]);

  if (!dashboard || !modulesAccess) forbidden();

  const labsModule = modulesAccess.modules.find((module) => module.key === "labs");
  const hostingRenewal = tenant ? new Date(new Date(tenant.createdAt).setFullYear(tenant.createdAt.getFullYear() + 1)) : null;

  return (
    <AppShell
      title="Configuracion / Billing"
      subtitle="Planes activos, fechas de caducidad y facturas del tenant."
      tenantLabel={membership.tenant.name}
      modules={modulesAccess.modules}
      notifications={dashboard.notifications}
      currentUserName={session.user.name ?? membership.tenant.name}
      projectCreation={dashboard.projectCreation}
    >
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <PanelCard
          eyebrow="Estado actual"
          title="Resumen de facturacion"
          description="Estado comercial unificado de Business, Labs y renovaciones."
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
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{getPlanLabel(subscription?.plan ?? "START")}</p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                Caducidad del plan: {formatDate(subscription?.currentPeriodEndsAt ?? null)}.
              </p>
            </div>
            <div className="rounded-3xl bg-[var(--surface-strong)] p-5">
              <p className="text-sm text-[var(--muted)]">Labs y mantenimiento</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                {labsModule?.isActive ? "Vase Labs activo" : "Vase Labs no contratado"}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                Hosting: {formatDate(subscription?.hostingEndsAt ?? hostingRenewal)} · Mantenimiento: {formatDate(subscription?.maintenanceEndsAt ?? null)}.
              </p>
            </div>
          </div>
        </PanelCard>

        <PanelCard
          eyebrow="Canal administrativo"
          title="Datos de cobranza"
          description="Datos usados para contacto comercial y notificaciones de facturacion."
        >
          <div className="grid gap-4">
            <div className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5">
              <p className="text-sm text-[var(--muted)]">Email de facturacion</p>
              <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{tenant?.billingEmail ?? membership.tenant.name}</p>
            </div>
            <Link
              href={"/precios" as Route}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
            >
              Ver tabla publica de planes
            </Link>
          </div>
        </PanelCard>
      </section>

      <PanelCard
        eyebrow="Facturas"
        title="Facturas y pagos emitidos"
        description="Comprobantes financieros registrados para este tenant."
      >
        <div className="grid gap-3">
          {invoices.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-strong)] p-5 text-sm text-[var(--muted)]">
              Todavia no hay facturas registradas para este tenant.
            </div>
          ) : (
            invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{invoice.concept}</p>
                    <p className="text-xs text-[var(--muted)]">{invoice.category} · Creada {formatDate(invoice.createdAt)}</p>
                  </div>
                  <StatusBadge tone={invoice.status === "ACTIVE" ? "success" : invoice.status === "PAST_DUE" ? "warning" : "neutral"} label={invoice.status} />
                </div>
                <div className="mt-3 grid gap-2 text-sm text-[var(--muted)] md:grid-cols-4">
                  <p>Total: <strong className="text-[var(--foreground)]">{formatMoney(Number(invoice.totalAmount))}</strong></p>
                  <p>Pagado: <strong className="text-[var(--foreground)]">{formatMoney(Number(invoice.paidAmount))}</strong></p>
                  <p>Vence: <strong className="text-[var(--foreground)]">{formatDate(invoice.dueAt)}</strong></p>
                  <p>Pago: <strong className="text-[var(--foreground)]">{formatDate(invoice.paidAt)}</strong></p>
                </div>
              </div>
            ))
          )}
        </div>
      </PanelCard>
    </AppShell>
  );
}
