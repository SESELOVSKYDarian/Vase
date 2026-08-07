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

  return (
    <main className="product-content">
      <p className="eyebrow">Centro operativo</p>
      <h1>{context.tenantName}</h1>
      <div className="metric-grid">
        <article><span>Sucursales</span><strong>{branches.length}</strong><small>de {context.entitlement.limits.branches}</small></article>
        <article><span>Equipo activo</span><strong>{staff}</strong><small>de {context.entitlement.limits.localEmployees}</small></article>
        <article><span>Dispositivos</span><strong>{devices}</strong><small>de {context.entitlement.limits.devices}</small></article>
        <article><span>Edge con alertas</span><strong>{unhealthyEdges.length}</strong><small>de {edges.length}</small></article>
        <article><span>Fiscal pendiente/rechazado</span><strong>{fiscalIssues}</strong><small>últimas 24 h</small></article>
        <article><span>Delivery degradado</span><strong>{deliveryIssues}</strong><small>conexiones</small></article>
      </div>
      <section className="ui-card">
        <h2>Continuidad por sucursal</h2>
        <div className="branch-list">
          {edges.map((edge) => {
            const stale = !edge.lastSeenAt ||
              now - edge.lastSeenAt.getTime() > 60_000;
            return <article key={edge.id}>
              <strong>{edge.branch.name}</strong>
              <code>{stale ? "SIN CONEXIÓN" : edge.status}</code>
              <span>
                Último contacto: {edge.lastSeenAt
                  ? edge.lastSeenAt.toLocaleString("es-AR") : "nunca"}
                {" · "}{edge.pendingEventCount} eventos pendientes
                {" · "}{edge.failedPrintJobCount} impresiones fallidas
              </span>
              {edge.lastErrorCode ? <small>{edge.lastErrorCode}</small> : null}
            </article>;
          })}
          {!edges.length ? <p>Todavía no hay un Edge enrolado.</p> : null}
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
