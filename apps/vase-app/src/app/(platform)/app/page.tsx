import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import type { Shortcut } from "@/components/layout/app-shell";
import { PanelCard } from "@/components/ui/panel-card";
import Link from "next/link";
import type { Route } from "next";
import { requireUser } from "@/lib/auth/guards";
import { getAppIndexRedirectPath } from "@/lib/auth/protected-app-redirect";
import { getTenantMembership } from "@/lib/tenancy/resolve-tenant";
import { prisma } from "@/lib/db/prisma";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";
import { getTenantAnalytics } from "@/server/queries/analytics";
import { getBillingLabel, getPlanLabel } from "@/lib/business/plans";
import { LabsRequiredNotice } from "@/components/labs/labs-required-notice";

type AppIndexPageProps = {
  searchParams: Promise<{ labs?: string | string[] }>;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: Date | null) {
  if (!value) return "Sin fecha definida";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(value);
}

export default async function AppIndexPage({ searchParams }: AppIndexPageProps) {
  const query = await searchParams;
  const showLabsRequired = query.labs === "required";
  const session = await requireUser();
  const membership = await getTenantMembership(session.user.id);
  const redirectPath = getAppIndexRedirectPath({
    platformRole: session.user.platformRole,
    tenantRole: membership?.role ?? null,
  });

  if (redirectPath) redirect(redirectPath as Route);

  if (!membership) {
    return (
      <AppShell
        title="Workspace pendiente"
        subtitle="Tu cuenta ya esta activa, pero todavia no tiene un espacio asignado."
        tenantLabel="Vase"
        currentUserName={session.user.name ?? session.user.email ?? "Usuario"}
      >
        <PanelCard
          title="Acceso en revision"
          description="Un administrador tiene que vincular esta cuenta a un cliente, tenant o modulo antes de abrir el panel operativo."
        >
          <p className="text-sm leading-7 text-[var(--muted)]">
            No hace falta volver a iniciar sesion. Cuando el acceso quede asignado, este panel te va a llevar al workspace correspondiente.
          </p>
        </PanelCard>
      </AppShell>
    );
  }

  switch (membership.role) {
    case "OWNER": {
      const [dashboard, analytics, user, subscription] = await Promise.all([
        getUnifiedTenantDashboard(membership.tenantId, session.user.id, session.user.platformRole),
        getTenantAnalytics(membership.tenantId, 30),
        prisma.user.findUnique({ where: { id: session.user.id }, select: { shortcuts: true } }),
        prisma.tenantSubscription.findUnique({ where: { tenantId: membership.tenantId } }),
      ]);

      if (!dashboard) {
        return (
          <AppShell
            title="Workspace en preparacion"
            subtitle="Tu acceso esta activo, pero el tablero todavia no tiene datos disponibles."
            tenantLabel={membership.tenant.name}
            currentUserName={session.user.name ?? membership.tenant.name}
          >
            <PanelCard
              title="Configuracion pendiente"
              description="Estamos esperando que se complete la configuracion del tenant para mostrar el panel principal."
            >
              <p className="text-sm leading-7 text-[var(--muted)]">
                La sesion esta iniciada correctamente. Revisa la asignacion del cliente desde el panel admin si este estado no cambia.
              </p>
            </PanelCard>
          </AppShell>
        );
      }

      return (
        <AppShell
          title="Panel de Vase"
          subtitle="Resumen del rendimiento real de tu operacion y estado de tus planes activos."
          tenantLabel={membership.tenant.name}
          modules={dashboard.modules}
          notifications={dashboard.notifications}
          shortcuts={Array.isArray(user?.shortcuts) ? (user.shortcuts as unknown as Shortcut[]) : []}
          currentUserName={session.user.name ?? membership.tenant.name}
          projectCreation={dashboard.projectCreation}
        >
          {showLabsRequired ? <LabsRequiredNotice /> : null}
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5">
              <p className="text-xs text-[var(--muted)]">Ventas hoy</p>
              <p className="mt-2 text-3xl font-bold text-[var(--foreground)]">{formatMoney(analytics.summary.salesToday)}</p>
            </article>
            <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5">
              <p className="text-xs text-[var(--muted)]">Leads hoy</p>
              <p className="mt-2 text-3xl font-bold text-[var(--foreground)]">{analytics.summary.leadsToday}</p>
            </article>
            <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5">
              <p className="text-xs text-[var(--muted)]">Dominios conectados (30d)</p>
              <p className="mt-2 text-3xl font-bold text-[var(--foreground)]">{analytics.summary.domainsConnectedLast30Days}</p>
            </article>
            <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-5">
              <p className="text-xs text-[var(--muted)]">Canales conectados (30d)</p>
              <p className="mt-2 text-3xl font-bold text-[var(--foreground)]">{analytics.summary.channelsConnectedLast30Days}</p>
            </article>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-soft)]">Planes activos</p>
              <div className="mt-4 grid gap-3 text-sm">
                <p className="text-[var(--muted)]">
                  Business: <strong className="text-[var(--foreground)]">{getPlanLabel(subscription?.plan ?? "START")}</strong>
                </p>
                <p className="text-[var(--muted)]">
                  Estado de facturacion: <strong className="text-[var(--foreground)]">{getBillingLabel(subscription?.billingStatus ?? "TRIAL")}</strong>
                </p>
                <p className="text-[var(--muted)]">
                  Caducidad del plan: <strong className="text-[var(--foreground)]">{formatDate(subscription?.currentPeriodEndsAt ?? null)}</strong>
                </p>
                <p className="text-[var(--muted)]">
                  Caducidad de mantenimiento: <strong className="text-[var(--foreground)]">{formatDate(subscription?.maintenanceEndsAt ?? null)}</strong>
                </p>
              </div>
              <Link
                href={"/app/billing" as Route}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--foreground)]"
              >
                Ver billing
              </Link>
            </article>

            <article className="rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-soft)]">Resumen de analiticas</p>
              <div className="mt-4 h-40 rounded-2xl bg-[var(--surface)] p-4">
                <div className="flex h-full items-end gap-2">
                  {analytics.series.sales.slice(-12).map((point) => (
                    <div key={point.date} className="flex flex-1 flex-col items-center justify-end gap-1">
                      <div className="w-full rounded-t-md bg-[var(--accent-strong)]/80" style={{ height: `${Math.min(100, point.value / 1500)}%` }} />
                    </div>
                  ))}
                </div>
              </div>
              <Link
                href={"/app/analytics" as Route}
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--foreground)]"
              >
                Abrir analiticas completas
              </Link>
            </article>
          </section>
        </AppShell>
      );
    }
    default:
      return (
        <AppShell
          title="Workspace"
          subtitle="Tu acceso esta activo."
          tenantLabel={membership.tenant.name}
          currentUserName={session.user.name ?? membership.tenant.name}
        >
          <PanelCard
            title="Rol sin panel dedicado"
            description="No encontramos una vista principal especifica para este rol."
          >
            <p className="text-sm leading-7 text-[var(--muted)]">
              La cuenta no se cerrara ni volvera a login. Pide a un administrador revisar el rol asignado si necesitas otro acceso.
            </p>
          </PanelCard>
        </AppShell>
      );
  }
}
