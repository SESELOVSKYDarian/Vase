import Link from "next/link";
import type { Route } from "next";
import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { BillingCards } from "@/components/panel/billing-cards";
import { AvatarUploader } from "@/components/panel/avatar-uploader";
import { ThemePicker } from "@/components/panel/theme-picker";
import { BusinessProfile } from "@/components/panel/business-profile";
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from "@/lib/business/business-profile";
import { DeleteAccountDanger } from "@/components/settings/delete-account-danger";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";
import { isMercadoPagoConfigured, listSavedCards, mercadoPagoPublicKey } from "@/server/services/mercadopago";
import {
  updateProfileNameAction,
} from "@/app/(platform)/app/settings/actions";

const TABS = [
  { id: "perfil", label: "Mi perfil" },
  { id: "negocio", label: "Mi negocio" },
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
  const profile = await prisma.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true } });
  const tabs = TABS.filter((item) => isOwner || item.id !== "facturacion");
  const tab = resolveTab(query.tab, tabs);
  const [businessInfo, branches, negocioBilling] =
    tab === "negocio"
      ? await Promise.all([
          prisma.tenantBusinessInfo.findUnique({ where: { tenantId: membership.tenantId } }),
          prisma.tenantBranch.findMany({ where: { tenantId: membership.tenantId }, orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }] }),
          prisma.tenantBillingProfile.findUnique({ where: { tenantId: membership.tenantId } }),
        ])
      : [null, [], null];
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
            <AvatarUploader name={session.user.name ?? ""} avatarUrl={profile?.avatarUrl ?? null} />
            <form action={updateProfileNameAction} style={{ marginTop: 16 }}>
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

      {tab === "negocio" ? (
        <BusinessProfile
          canEdit={isOwner}
          logoUrl={businessInfo?.logoUrl ?? null}
          values={{
            name: membership.tenant.name,
            industry: membership.tenant.industry,
            tagline: businessInfo?.tagline ?? "",
            timezone: businessInfo?.timezone ?? DEFAULT_TIMEZONE,
            currency: businessInfo?.currency ?? DEFAULT_CURRENCY,
            hours: businessInfo?.hours ?? "",
            tiktok: businessInfo?.tiktok ?? "",
            youtube: businessInfo?.youtube ?? "",
            city: negocioBilling?.city ?? "",
            province: negocioBilling?.province ?? "",
            postalCode: negocioBilling?.postalCode ?? "",
            phone: businessInfo?.phone ?? "",
            whatsapp: businessInfo?.whatsapp ?? "",
            email: businessInfo?.email ?? "",
            website: businessInfo?.website ?? "",
            instagram: businessInfo?.instagram ?? "",
            facebook: businessInfo?.facebook ?? "",
            legalName: negocioBilling?.legalName ?? "",
            taxId: negocioBilling?.taxId ?? "",
            taxCondition: negocioBilling?.taxCondition ?? "",
            fiscalAddress: negocioBilling?.fiscalAddress ?? "",
          }}
          branches={branches.map((branch) => ({
            id: branch.id,
            name: branch.name,
            address: branch.address,
            phone: branch.phone ?? "",
            hours: branch.hours ?? "",
            isMain: branch.isMain,
          }))}
        />
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
            <div className="vpa-sech" style={{ marginBottom: 0 }}>
              <div>
                <h3>Datos de facturación</h3>
                <p>Razón social, CUIT y domicilio fiscal están en Mi negocio. Las facturas llegan a {membership.tenant.billingEmail ?? "tu correo"}.</p>
              </div>
              <Link href={"/app/settings?tab=negocio" as Route} className="vpa-btn line sm">
                Ir a Mi negocio
              </Link>
            </div>
          </section>
        </>
      ) : null}
    </AppShell>
  );
}
