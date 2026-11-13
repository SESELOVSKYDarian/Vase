import Link from "next/link";
import type { Route } from "next";
import { forbidden, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AddDomainButton } from "@/components/panel/business-webs";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { getPlanLimits } from "@/lib/business/plans";
import { describeDomainState } from "@/lib/business/web-cards";
import { getStorefrontBuilderData } from "@/server/queries/builder";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";

const addedLabel = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function SiteDomainsPage({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  let membership;
  let session;

  try {
    ({ membership, session } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const { pageId } = await params;
  const [builder, dashboard] = await Promise.all([
    getStorefrontBuilderData(membership.tenantId, pageId),
    getUnifiedTenantDashboard(membership.tenantId, session.user.id, session.user.platformRole),
  ]);

  if (!builder) {
    notFound();
  }

  const canUseDomain = getPlanLimits(builder.plan).canUseCustomDomain;
  const domains = builder.page.domainConnections;
  const needsSetup = domains.length === 0 || domains.some((domain) => domain.status !== "CONNECTED");
  const apexIp = process.env.PLATFORM_APEX_IP?.trim() || null;
  const cnameTarget = process.env.PLATFORM_CNAME_TARGET?.trim() || "vase.ar";

  return (
    <AppShell
      title="Dominios"
      subtitle={builder.page.name}
      tenantLabel={membership.tenant.name}
      modules={dashboard?.modules}
      notifications={dashboard?.notifications}
      currentUserName={session.user.name ?? membership.tenant.name}
    >
      <Link href={"/app/business" as Route} className="vpa-backl">
        ← Tus webs
      </Link>

      <section className="vpa-card" aria-label="Direcciones de tu web">
        <div className="vpa-sech">
          <div>
            <h3>Direcciones de tu web</h3>
            <p>Por dónde entran tus clientes.</p>
          </div>
          <AddDomainButton web={{ id: pageId, name: builder.page.name }} canUseDomain={canUseDomain} />
        </div>
        {domains.map((domain) => {
          const shown = describeDomainState(domain.status);
          return (
            <div className="vpa-todo" key={domain.id}>
              <div className="vpa-g1">
                <b>{domain.hostname}</b>
                <span>Agregado el {addedLabel.format(new Date(domain.createdAt))}</span>
              </div>
              <span className={`vpa-tag ${shown.tone}`}>
                <i />
                {shown.state}
              </span>
            </div>
          );
        })}
        <div className="vpa-todo">
          <div className="vpa-g1">
            <b>{builder.page.slug}.vase.ar</b>
            <span>Dirección de Vase, siempre funciona</span>
          </div>
          <span className="vpa-tag g">
            <i />
            Activa
          </span>
        </div>
      </section>

      {needsSetup ? (
        <section className="vpa-card" aria-label="Cómo conectar tu dominio">
          <div className="vpa-sech">
            <div>
              <h3>Qué cargar donde compraste el dominio</h3>
              <p>Agregá estos dos datos en Nic.ar, GoDaddy, Cloudflare o donde lo tengas.</p>
            </div>
          </div>
          <div className="vpa-tw">
            <table className="vpa-tbl">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Nombre</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>A</b></td>
                  <td className="vpa-mut">@</td>
                  <td>{apexIp ?? "Te lo pasamos por Ayuda y soporte"}</td>
                </tr>
                <tr>
                  <td><b>CNAME</b></td>
                  <td className="vpa-mut">www</td>
                  <td>{cnameTarget}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="vpa-hrow" style={{ marginTop: 14 }}>
            <div className="vpa-g1">
              <b>Puede tardar hasta 24 horas</b>
              <span>El estado de arriba cambia solo cuando quede conectado.</span>
            </div>
            <Link href={"/app/help" as Route} className="vpa-btn line sm">
              Pedir ayuda
            </Link>
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
