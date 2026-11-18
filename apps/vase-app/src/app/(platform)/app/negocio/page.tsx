import { AppShell } from "@/components/layout/app-shell";
import { HeroLogo } from "@/components/panel/business-profile/LogoPicker";
import { NegocioBody, loadSettingsContext } from "../settings/settings-content";

/**
 * Mi negocio: lo que es de tu negocio (logo, contacto, sucursales y datos fiscales). Arriba, la cabecera
 * con el logo, que se cambia ahí mismo, y lo que falta completar. Abajo, cada parte a la vista.
 */
export default async function NegocioPage() {
  const ctx = await loadSettingsContext("negocio");
  const { membership, session, dashboard, businessInfo, branches, negocioBilling, isOwner } = ctx;

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
  const name = membership.tenant.name;
  const contact = [businessInfo?.whatsapp || businessInfo?.phone, businessInfo?.email, branches.find((branch) => branch.isMain)?.address ?? branches[0]?.address]
    .map((value) => value?.trim())
    .filter(Boolean) as string[];

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
          <HeroLogo name={name} logoUrl={businessInfo?.logoUrl ?? null} readOnly={!isOwner} />
          <div className="vpa-ninfo">
            <h2>{name}</h2>
            <p>{businessInfo?.tagline?.trim() || membership.tenant.industry || "Contá en una frase qué hace tu negocio."}</p>
            {contact.length > 0 ? (
              <div className="vpa-nchips">
                {contact.map((value) => (
                  <span key={value}>{value}</span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="vpa-nmeter">
            <b>{done === checks.length ? "Tu negocio está completo" : `Completaste ${done} de ${checks.length}`}</b>
            <span className="vpa-nprog" aria-hidden="true">
              <i style={{ width: `${Math.round((done / checks.length) * 100)}%` }} />
            </span>
            <small>
              {done === checks.length
                ? "Tus clientes tienen todo lo que necesitan para contactarte."
                : `Te falta: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? " y más" : ""}.`}
            </small>
          </div>
        </section>

        <NegocioBody ctx={ctx} hideLogo />
      </div>
    </AppShell>
  );
}
