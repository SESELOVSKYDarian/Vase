import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { resolveRestOwnerRequest } from "@/lib/request-context";
import { RestShell } from "../rest-shell";

export default async function OwnerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string; branch?: string }>;
}) {
  const query = await searchParams;
  try {
    const requestHeaders = await headers();
    const context = await resolveRestOwnerRequest({
      cookieHeader: requestHeaders.get("cookie"),
      requestedTenantSlug: query.tenant,
    });
    const branches = await db.branch.findMany({
      where: { globalTenantId: context.globalTenantId, active: true },
      orderBy: { name: "asc" },
    });
    if (branches.length === 0) redirect(`/onboarding?tenant=${context.tenantSlug}`);
    const activeBranch = branches.find((branch) => branch.id === query.branch) ?? branches[0]!;
    const [staff, devices] = await Promise.all([
      db.localEmployee.count({ where: { globalTenantId: context.globalTenantId, active: true } }),
      db.device.count({ where: { globalTenantId: context.globalTenantId, status: "ACTIVE" } }),
    ]);
    return (
      <RestShell role="OWNER" branchName={activeBranch.name} actorName={context.actor.displayName}>
        <main className="product-content">
          <p className="eyebrow">Centro operativo</p>
          <h1>{context.tenantName}</h1>
          <div className="metric-grid">
            <article><span>Sucursales</span><strong>{branches.length}</strong><small>de {context.entitlement.limits.branches}</small></article>
            <article><span>Equipo activo</span><strong>{staff}</strong><small>de {context.entitlement.limits.localEmployees}</small></article>
            <article><span>Dispositivos</span><strong>{devices}</strong><small>de {context.entitlement.limits.devices}</small></article>
          </div>
        </main>
      </RestShell>
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("SESSION")) {
      redirect("https://app.vase.ar/signin?redirectTo=https%3A%2F%2Frest.vase.ar%2Fowner");
    }
    throw error;
  }
}
