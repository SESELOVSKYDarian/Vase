import { Check } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PANEL_PRODUCTS } from "@/components/panel/products";
import { NegocioBody, loadSettingsContext } from "../settings/settings-content";

/**
 * Mi negocio: lo que es de tu negocio y usan todos tus productos (logo, contacto, sucursales y datos
 * fiscales). Antes era una pestaña de Ajustes; ahora tiene su lugar en el menú.
 */
export default async function NegocioPage() {
  const ctx = await loadSettingsContext("negocio");
  const { membership, session, dashboard, businessInfo, branches, negocioBilling } = ctx;

  const checks = [
    { label: "Logo", done: Boolean(businessInfo?.logoUrl) },
    { label: "Una frase que te describa", done: Boolean(businessInfo?.tagline?.trim()) },
    { label: "WhatsApp o teléfono", done: Boolean(businessInfo?.whatsapp?.trim() || businessInfo?.phone?.trim()) },
    { label: "Correo de contacto", done: Boolean(businessInfo?.email?.trim()) },
    { label: "Horario", done: Boolean(businessInfo?.hours?.trim()) },
    { label: "Al menos una sucursal", done: branches.length > 0 },
    { label: "Razón social y CUIT", done: Boolean(negocioBilling?.legalName?.trim() && negocioBilling?.taxId?.trim()) },
  ];
  const done = checks.filter((item) => item.done).length;
  const missing = checks.filter((item) => !item.done).map((item) => item.label.toLowerCase());
  const activeProducts = dashboard.modules.filter((module) => module.isActive);
  const name = membership.tenant.name;

  return (
    <AppShell
      title="Mi negocio"
      subtitle="Lo cargás una vez y lo usan todos tus productos"
      tenantLabel={name}
      modules={dashboard.modules}
      notifications={dashboard.notifications}
      currentUserName={session.user.name ?? name}
      viewerRole={membership.role}
    >
      <div className="vpa-stack" style={{ gap: 20 }}>
        <section className="vpa-nhero" aria-label="Tu negocio">
          <span className="vpa-nlogo" aria-hidden="true">
            {businessInfo?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- logo subido por el cliente, de cualquier origen
              <img src={businessInfo.logoUrl} alt="" />
            ) : (
              name.slice(0, 1).toUpperCase()
            )}
          </span>
          <div className="vpa-ninfo">
            <h2>{name}</h2>
            <p>{businessInfo?.tagline?.trim() || membership.tenant.industry || "Contá en una frase qué hace tu negocio."}</p>
            <div className="vpa-nchips" aria-label="Productos que usan estos datos">
              {activeProducts.length === 0 ? <span className="off">Todavía no tenés productos activos</span> : null}
              {activeProducts.map((module) => (
                <span key={module.key}>
                  <Check size={13} aria-hidden="true" />
                  {PANEL_PRODUCTS[module.key].name}
                </span>
              ))}
            </div>
          </div>
          <div className="vpa-nmeter">
            <b>{done === checks.length ? "Tu negocio está completo" : `Completaste ${done} de ${checks.length}`}</b>
            <span className="vpa-nprog" aria-hidden="true">
              <i style={{ width: `${Math.round((done / checks.length) * 100)}%` }} />
            </span>
            <small>
              {done === checks.length
                ? "Tus productos muestran todo lo que tus clientes necesitan para contactarte."
                : `Te falta: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? " y más" : ""}.`}
            </small>
          </div>
        </section>

        <NegocioBody ctx={ctx} />
      </div>
    </AppShell>
  );
}
