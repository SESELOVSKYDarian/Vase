import Link from "next/link";
import type { Route } from "next";
import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { BillingCards } from "@/components/panel/billing-cards";
import { ThemePicker } from "@/components/panel/theme-picker";
import { DeleteAccountDanger } from "@/components/settings/delete-account-danger";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { updateBillingProfileAction } from "@/app/(platform)/app/billing/actions";
import { prisma } from "@/lib/db/prisma";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";
import { isMercadoPagoConfigured, listSavedCards, mercadoPagoPublicKey } from "@/server/services/mercadopago";
import {
  updateProfileNameAction,
  updateTenantBusinessDataAction,
} from "@/app/(platform)/app/settings/actions";

const TABS = [
  { id: "perfil", label: "Mi perfil" },
  { id: "negocio", label: "Tu negocio" },
  { id: "facturacion", label: "Facturación" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function resolveTab(value: string | string[] | undefined, available: readonly { id: TabId }[]): TabId {
  return available.find((tab) => tab.id === value)?.id ?? "perfil";
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  let membership;
  let session;
  try {
    ({ membership, session } = await requireTenantRole(tenantRoles.MEMBER));
  } catch {
    forbidden();
  }

  const [dashboard, query] = await Promise.all([
    getUnifiedTenantDashboard(membership.tenantId, session.user.id, session.user.platformRole),
    searchParams,
  ]);
  if (!dashboard) forbidden();

  const isOwner = membership.role === "OWNER";
  const tabs = TABS.filter((item) => isOwner || item.id !== "facturacion");
  const tab = resolveTab(query.tab, tabs);
  const paymentsEnabled = isMercadoPagoConfigured();
  const billingProfile =
    tab === "facturacion" ? await prisma.tenantBillingProfile.findUnique({ where: { tenantId: membership.tenantId } }) : null;
  const cards =
    tab === "facturacion" && paymentsEnabled
      ? (await listSavedCards(billingProfile?.mercadoPagoCustomerId)).map((card) => ({
          ...card,
          isDefault: card.id === billingProfile?.defaultCardId,
        }))
      : [];

  return (
    <AppShell
      title="Ajustes"
      subtitle="Tu perfil, tu negocio y la facturación"
      tenantLabel={membership.tenant.name}
      modules={dashboard.modules}
      notifications={dashboard.notifications}
      currentUserName={session.user.name ?? membership.tenant.name}
      viewerRole={membership.role}
    >
      <div>
        <div className="vpa-seg" role="tablist" aria-label="Ajustes">
          {tabs.map((item) => (
            <Link
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              href={`/app/settings?tab=${item.id}` as Route}
              className={tab === item.id ? "on" : ""}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {tab === "perfil" ? (
        <>
          <section className="vpa-card">
            <div className="vpa-sech">
              <div>
                <h3>Mi perfil</h3>
                <p>Tus datos para entrar a Vase.</p>
              </div>
            </div>
            <form action={updateProfileNameAction}>
              <div className="vpa-form">
                <label className="vpa-fld">
                  <span>Nombre</span>
                  <input className="vpa-inp" name="name" required defaultValue={session.user.name ?? ""} />
                </label>
                <label className="vpa-fld">
                  <span>Correo</span>
                  <input className="vpa-inp" readOnly value={session.user.email ?? ""} />
                </label>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button className="vpa-btn acc">Guardar</button>
              </div>
            </form>
            <div className="vpa-hrow" style={{ marginTop: 14 }}>
              <div className="vpa-g1">
                <b>Contraseña</b>
                <span>Te mandamos un correo para cambiarla</span>
              </div>
              <Link href={"/forgot-password" as Route} className="vpa-btn line sm">
                Cambiar contraseña
              </Link>
            </div>
          </section>
          <section className="vpa-card">
            <div className="vpa-sech">
              <div>
                <h3>Apariencia</h3>
                <p>Cómo querés ver tu panel.</p>
              </div>
            </div>
            <ThemePicker />
          </section>
          {isOwner ? <DeleteAccountDanger /> : null}
        </>
      ) : null}

      {tab === "negocio" && !isOwner ? (
        <section className="vpa-card">
          <div className="vpa-sech">
            <div>
              <h3>Tu negocio</h3>
              <p>Solo el Dueño de la cuenta puede cambiar estos datos.</p>
            </div>
          </div>
          <div className="vpa-form">
            <label className="vpa-fld">
              <span>Nombre del negocio</span>
              <input className="vpa-inp" readOnly value={membership.tenant.name} />
            </label>
            <label className="vpa-fld">
              <span>Rubro</span>
              <input className="vpa-inp" readOnly value={membership.tenant.industry} />
            </label>
          </div>
        </section>
      ) : null}

      {tab === "negocio" && isOwner ? (
        <section className="vpa-card">
          <div className="vpa-sech">
            <div>
              <h3>Tu negocio</h3>
              <p>Los datos con los que Vase te factura y te contacta. Solo el Dueño puede cambiarlos.</p>
            </div>
          </div>
          <form action={updateTenantBusinessDataAction}>
            <div className="vpa-form">
              <label className="vpa-fld">
                <span>Nombre del negocio</span>
                <input className="vpa-inp" name="name" required defaultValue={membership.tenant.name} />
              </label>
              <label className="vpa-fld">
                <span>Nombre de la cuenta</span>
                <input className="vpa-inp" name="accountName" required defaultValue={membership.tenant.accountName} />
              </label>
              <label className="vpa-fld">
                <span>Rubro</span>
                <input className="vpa-inp" name="industry" required defaultValue={membership.tenant.industry} />
              </label>
              <label className="vpa-fld">
                <span>Correo de facturación</span>
                <input className="vpa-inp" name="billingEmail" type="email" defaultValue={membership.tenant.billingEmail ?? ""} />
              </label>
            </div>
            <input type="hidden" name="locale" value={membership.tenant.locale} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button className="vpa-btn acc">Guardar</button>
            </div>
          </form>
        </section>
      ) : null}

      {tab === "facturacion" ? (
        <>
          {paymentsEnabled ? (
            <BillingCards cards={cards} publicKey={mercadoPagoPublicKey()} />
          ) : (
            <section className="vpa-card">
              <h3>Medios de pago</h3>
              <p>Todavía no está habilitado guardar tarjetas.</p>
            </section>
          )}
          <section className="vpa-card">
            <div className="vpa-sech">
              <div>
                <h3>Datos de facturación</h3>
                <p>Lo que sale en tus facturas.</p>
              </div>
              <Link href={"/app/billing" as Route} className="vpa-btn line sm">
                Ver comprobantes
              </Link>
            </div>
            <form action={updateBillingProfileAction}>
              <div className="vpa-form">
                <label className="vpa-fld">
                  <span>Razón social</span>
                  <input className="vpa-inp" name="legalName" maxLength={191} defaultValue={billingProfile?.legalName ?? ""} />
                </label>
                <label className="vpa-fld">
                  <span>CUIT</span>
                  <input className="vpa-inp" name="taxId" maxLength={191} defaultValue={billingProfile?.taxId ?? ""} />
                </label>
                <label className="vpa-fld">
                  <span>Condición frente al IVA</span>
                  <input className="vpa-inp" name="taxCondition" maxLength={191} defaultValue={billingProfile?.taxCondition ?? ""} />
                </label>
                <label className="vpa-fld">
                  <span>Domicilio fiscal</span>
                  <input className="vpa-inp" name="fiscalAddress" maxLength={191} defaultValue={billingProfile?.fiscalAddress ?? ""} />
                </label>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button className="vpa-btn acc">Guardar</button>
              </div>
            </form>
          </section>
        </>
      ) : null}
    </AppShell>
  );
}
