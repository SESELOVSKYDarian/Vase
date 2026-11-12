import { Bike, Building2, FileWarning, MonitorSmartphone, Server, Users } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { resolveRestOwnerRequest } from "@/lib/request-context";

export default async function OwnerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string; branch?: string }>;
}) {
  const query = await searchParams;
  const {
    context,
    branches,
    staff,
    devices,
    edges,
    fiscalIssues,
    deliveryIssues,
    unhealthyEdges,
    now,
  } = await loadOwnerDashboard(query);

  const kpis = [
    { icon: Building2, label: "Sucursales", value: branches.length, note: `de ${context.entitlement.limits.branches} de tu plan`, tone: "up", href: "/owner/settings/scopes" },
    { icon: Users, label: "Equipo activo", value: staff, note: `de ${context.entitlement.limits.localEmployees} de tu plan`, tone: "up", href: "/owner/staff" },
    { icon: MonitorSmartphone, label: "Dispositivos", value: devices, note: `de ${context.entitlement.limits.devices} de tu plan`, tone: "up", href: "/owner/settings/devices" },
    { icon: Server, label: "Sucursales con alertas", value: unhealthyEdges.length, note: unhealthyEdges.length ? "revisá la lista de abajo" : "todo en orden", tone: unhealthyEdges.length ? "dn" : "up", href: "/owner/settings/devices" },
    { icon: FileWarning, label: "Facturas por revisar", value: fiscalIssues, note: fiscalIssues ? "pendientes o rechazadas, 24 h" : "nada pendiente", tone: fiscalIssues ? "dn" : "up", href: "/owner/settings/fiscal" },
    { icon: Bike, label: "Delivery con problemas", value: deliveryIssues, note: deliveryIssues ? "conexiones con error" : "todo conectado", tone: deliveryIssues ? "dn" : "up", href: "/owner/settings/delivery" },
  ] as const;

  return (
    <main className="product-content with-head">
      <p className="eyebrow">Centro operativo</p>
      <h1>{context.tenantName}</h1>
      <p className="lede">Así están tus sucursales ahora. Tocá cualquier número para ir al detalle.</p>

      <div className="vr-kpis">
        {kpis.map(({ icon: Icon, label, value, note, tone, href }) => (
          <a key={label} className="vr-kpi" href={href}>
            <span className="vr-kic"><Icon size={19} aria-hidden="true" /></span>
            <span>
              <small>{label}</small>
              <b>{value}</b>
              <span className={`vr-${tone}`}>{note}</span>
            </span>
          </a>
        ))}
      </div>

      <section className="ui-card">
        <div className="vr-ch">
          <div><h2>Continuidad por sucursal</h2><small>Cada sucursal trabaja con su servidor local y se sincroniza con la nube.</small></div>
          <div className="vr-sp" />
          <a className="button sm" href="/owner/settings/devices">Ver dispositivos</a>
        </div>
        <div className="branch-list">
          {edges.map((edge) => {
            const stale = !edge.lastSeenAt ||
              now - edge.lastSeenAt.getTime() > 60_000;
            const tone = stale || edge.lastErrorCode ? "r" : edge.pendingEventCount || edge.failedPrintJobCount ? "y" : "g";
            return <article key={edge.id}>
              <strong>{edge.branch.name}</strong>
              <code className={`vr-tag ${tone}`}><i />{stale ? "SIN CONEXIÓN" : edge.status}</code>
              <span>
                Último contacto: {edge.lastSeenAt
                  ? edge.lastSeenAt.toLocaleString("es-AR") : "nunca"}
                {" · "}{edge.pendingEventCount} eventos pendientes
                {" · "}{edge.failedPrintJobCount} impresiones fallidas
              </span>
              {edge.lastErrorCode ? <small>{edge.lastErrorCode}</small> : null}
            </article>;
          })}
          {!edges.length ? (
            <div className="vr-empty">
              <b>Todavía no conectaste ninguna sucursal</b>
              <span>Instalá Vase Rest Edge en la sucursal para que siga trabajando aunque se corte internet.</span>
              <a className="button button-primary sm" href="/owner/settings/devices">Conectar una sucursal</a>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

async function loadOwnerDashboard(query: { tenant?: string; branch?: string }) {
  let context: Awaited<ReturnType<typeof resolveRestOwnerRequest>>;
  let branches: Awaited<ReturnType<typeof db.branch.findMany>>;
  try {
    const requestHeaders = await headers();
    context = await resolveRestOwnerRequest({
      cookieHeader: requestHeaders.get("cookie"),
      requestedTenantSlug: query.tenant,
    });
    branches = await db.branch.findMany({
      where: { globalTenantId: context.globalTenantId, active: true },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("SESSION")) {
      redirect("https://app.vase.ar/signin?redirectTo=https%3A%2F%2Frest.vase.ar%2Fowner");
    }
    throw error;
  }
  if (branches.length === 0) redirect(`/onboarding?tenant=${context.tenantSlug}`);

  try {
    const [{ now: databaseNow, fiscalCutoff }] = await db.$queryRaw<
      Array<{ now: Date; fiscalCutoff: Date }>
    >`
      SELECT
        CURRENT_TIMESTAMP AS now,
        CURRENT_TIMESTAMP - INTERVAL '24 hours' AS "fiscalCutoff"
    `;
    const [staff, devices, edges, fiscalIssues, deliveryIssues] = await Promise.all([
      db.localEmployee.count({ where: { globalTenantId: context.globalTenantId, active: true } }),
      db.device.count({ where: { globalTenantId: context.globalTenantId, status: "ACTIVE" } }),
      db.edgeInstallation.findMany({
        where: { globalTenantId: context.globalTenantId },
        include: { branch: { select: { name: true } } },
        orderBy: { branch: { name: "asc" } },
      }),
      db.fiscalDocument.count({
        where: {
          globalTenantId: context.globalTenantId,
          status: { in: ["REJECTED", "PENDING"] },
          createdAt: { gte: fiscalCutoff },
        },
      }),
      db.deliveryConnection.count({
        where: {
          globalTenantId: context.globalTenantId,
          OR: [{ lastError: { not: null } }, { status: "DEGRADED" }],
        },
      }),
    ]);
    const now = databaseNow.getTime();
    const unhealthyEdges = edges.filter((edge) =>
      edge.status !== "ACTIVE" ||
      !edge.lastSeenAt ||
      now - edge.lastSeenAt.getTime() > 60_000 ||
      edge.pendingEventCount > 0 ||
      edge.failedPrintJobCount > 0 ||
      Boolean(edge.lastErrorCode));

    return {
      context,
      branches,
      staff,
      devices,
      edges,
      fiscalIssues,
      deliveryIssues,
      unhealthyEdges,
      now,
    };
  } catch (error) {
    throw error;
  }
}
