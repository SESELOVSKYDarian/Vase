import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { CircleHelp, ClipboardCheck, CreditCard, Settings2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { NavLink } from "@/components/layout/nav-link";
import { ProductArt } from "@/components/panel/product-art";
import { PANEL_PRODUCTS, formatArs, panelProductHref } from "@/components/panel/products";
import { PanelCard } from "@/components/ui/panel-card";
import { requireUser } from "@/lib/auth/guards";
import { getAppIndexRedirectPath } from "@/lib/auth/protected-app-redirect";
import { getTenantMembership } from "@/lib/tenancy/resolve-tenant";
import { prisma } from "@/lib/db/prisma";
import { getTenantCustomizationQuoteWorkspace } from "@/server/queries/custom-quotes";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long" }).format(value);
}

export default async function AppIndexPage() {
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
      const [dashboard, nextPayment, quotes] = await Promise.all([
        getUnifiedTenantDashboard(membership.tenantId, session.user.id, session.user.platformRole),
        prisma.clientPayment.findFirst({
          where: { tenantId: membership.tenantId, paidAt: null, status: { not: "CANCELED" } },
          orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
          select: { concept: true, totalAmount: true, paidAmount: true, dueAt: true },
        }),
        getTenantCustomizationQuoteWorkspace(membership.tenantId),
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

      const firstName = (session.user.name ?? "").trim().split(/\s+/)[0];
      const activeModules = dashboard.modules.filter((module) => module.isActive);
      const pendingQuotes = quotes.metrics.pendingClient;

      return (
        <AppShell
          title={firstName ? `Hola, ${firstName}` : "Hola"}
          subtitle="¿A dónde querés ir?"
          tenantLabel={membership.tenant.name}
          modules={dashboard.modules}
          notifications={dashboard.notifications}
          currentUserName={session.user.name ?? membership.tenant.name}
        >
          <div className="vpa-hm">
            {nextPayment ? (
              <div className="vpa-alert" role="status">
                <span className="ic" aria-hidden="true">
                  <CreditCard size={20} />
                </span>
                <div className="vpa-g1">
                  <b>
                    {nextPayment.concept}
                    {nextPayment.dueAt ? ` vence el ${formatDate(nextPayment.dueAt)}` : ""}
                  </b>
                  <span className="t">{formatArs(Number(nextPayment.totalAmount) - Number(nextPayment.paidAmount))}</span>
                </div>
                <Link href={"/app/billing" as Route} className="vpa-btn ink">
                  Ver
                </Link>
              </div>
            ) : null}

            <section aria-label="Tus productos">
              <div className="vpa-hmh">
                <h2>Tus productos</h2>
                <Link href={"/app/products" as Route} className="vpa-lnk">
                  Ver todos
                </Link>
              </div>
              {activeModules.length === 0 ? (
                <div className="vpa-empty">Todavía no tenés productos activos.</div>
              ) : (
                <div className="vpa-tiles">
                  {activeModules.map((module) => {
                    const product = PANEL_PRODUCTS[module.key];
                    return (
                      <NavLink
                        key={module.key}
                        href={panelProductHref(module.key)}
                        forceDocumentNavigation={module.key === "management"}
                        className="vpa-tile"
                        style={{ background: product.artBg, color: product.artTx }}
                      >
                        <span className="vpa-tcopy">
                          <b>{product.name}</b>
                          <span className="d">{product.short}</span>
                          <span className="goin">Entrar</span>
                        </span>
                        <span className="vpa-tart" aria-hidden="true">
                          <ProductArt product={module.key} variant="tile" />
                        </span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </section>

            <section aria-label="Tu cuenta">
              <div className="vpa-hmh">
                <h2>Tu cuenta</h2>
              </div>
              <div className="vpa-quick">
                <Link href={"/app/billing" as Route} className="vpa-qk">
                  <span className="ic" aria-hidden="true">
                    <CreditCard size={20} />
                  </span>
                  <span>
                    <b>Plan y pagos</b>
                    <span className="t">Cuánto pagás y facturas</span>
                  </span>
                </Link>
                <Link href={"/app/owner/customizations" as Route} className="vpa-qk">
                  {pendingQuotes > 0 ? <span className="pin" aria-hidden="true" /> : null}
                  <span className="ic" aria-hidden="true">
                    <ClipboardCheck size={20} />
                  </span>
                  <span>
                    <b>Trabajos a medida</b>
                    <span className="t">
                      {pendingQuotes > 0
                        ? `${pendingQuotes} presupuesto${pendingQuotes === 1 ? "" : "s"} para revisar`
                        : "Lo que le pediste a Vase"}
                    </span>
                  </span>
                </Link>
                <Link href={"/app/help" as Route} className="vpa-qk">
                  <span className="ic" aria-hidden="true">
                    <CircleHelp size={20} />
                  </span>
                  <span>
                    <b>Ayuda y soporte</b>
                    <span className="t">Guías y consultas</span>
                  </span>
                </Link>
                <Link href={"/app/settings" as Route} className="vpa-qk">
                  <span className="ic" aria-hidden="true">
                    <Settings2 size={20} />
                  </span>
                  <span>
                    <b>Ajustes</b>
                    <span className="t">Tu perfil y tu negocio</span>
                  </span>
                </Link>
              </div>
            </section>
          </div>
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
