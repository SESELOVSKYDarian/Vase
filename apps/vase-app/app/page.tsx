import { createLabsCheckoutPreview, createLabsTenantProvisioning } from "./lib/labs-billing";

const launcher = [
  { name: "Vase Business", href: "https://business.vase.ar" },
  { name: "Vase Management", href: "https://management.vase.ar" },
  { name: "Vase Labs", href: "https://labs.vase.ar" },
];

const labsPreview = createLabsCheckoutPreview({
  globalTenantId: "tenant_norte",
  companyName: "Norte Equipos",
  plan: "GROWTH",
  tokenPack: "BASIC",
});

const provisioning = createLabsTenantProvisioning({
  globalCompanyId: "company_norte",
  globalTenantId: "tenant_norte",
  globalUserId: "user_owner",
  companyName: "Norte Equipos",
  tenantSlug: "norte-equipos",
  plan: "GROWTH",
  tokenPack: "BASIC",
});

const flowSteps = [
  "Cliente elige plan Labs en marketplace",
  "App crea empresa, tenant y membership owner",
  "App asigna entitlement labs con metadata de acceso",
  "Labs lee la proyeccion por contrato/API interna",
];

export default function Page() {
  return (
    <main className="app-shell">
      <section className="app-hero">
        <p className="eyebrow">Vase App</p>
        <h1>Identidad, tenants, billing futuro y launcher.</h1>
        <p>
          Esta base deja preparado el flujo para comprar Labs, provisionar tenant y proyectar accesos sin implementar pagos
          reales todavia.
        </p>
      </section>

      <section className="launcher-grid" aria-label="Productos Vase">
        {launcher.map((item) => (
          <a key={item.href} href={item.href}>
            {item.name}
          </a>
        ))}
      </section>

      <section className="billing-panel">
        <div>
          <p className="eyebrow">Preparacion billing Labs</p>
          <h2>Compra simulada sin cobro real</h2>
        </div>

        <div className="flow-grid">
          {flowSteps.map((step, index) => (
            <article key={step}>
              <span>{index + 1}</span>
              <p>{step}</p>
            </article>
          ))}
        </div>

        <div className="projection-grid">
          <article>
            <span>Producto</span>
            <strong>{labsPreview.productKey}</strong>
          </article>
          <article>
            <span>Plan</span>
            <strong>{labsPreview.access.plan}</strong>
          </article>
          <article>
            <span>Canales</span>
            <strong>{labsPreview.access.enabledChannels.join(" + ")}</strong>
          </article>
          <article>
            <span>Tokens iniciales</span>
            <strong>{labsPreview.access.tokensIncluded.toLocaleString("es-AR")}</strong>
          </article>
          <article>
            <span>Pack extra</span>
            <strong>{labsPreview.access.extraTokens.toLocaleString("es-AR")}</strong>
          </article>
          <article>
            <span>Tenant</span>
            <strong>{provisioning.tenant.slug}</strong>
          </article>
        </div>
      </section>
    </main>
  );
}
