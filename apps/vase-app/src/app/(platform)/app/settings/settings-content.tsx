import Link from "next/link";
import type { Route } from "next";
import { forbidden } from "next/navigation";
import { BillingCards } from "@/components/panel/billing-cards";
import { AvatarUploader } from "@/components/panel/avatar-uploader";
import { ThemePicker } from "@/components/panel/theme-picker";
import { BusinessProfile } from "@/components/panel/business-profile";
import { ConnectionsHub } from "@/components/panel/connections-hub";
import { ExternalConnection } from "@/components/panel/external-connection";
import { DATA_RESOURCES, defaultSource, type DataResourceId, type DataSourceId, type ProductKey } from "@/lib/business/data-sources";
import { getBusinessConnection } from "@/server/services/business-connection";
import { importBusinessProfileSeed } from "@/server/services/business-profile";
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE } from "@/lib/business/business-profile";
import { legacySocialLinks, type SocialLink } from "@/lib/business/social-links";
import { ProfileNameField } from "@/components/panel/profile-name-field";
import { DeleteAccountDanger } from "@/components/settings/delete-account-danger";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";
import { isMercadoPagoConfigured, listSavedCards, mercadoPagoPublicKey } from "@/server/services/mercadopago";

const TABS = [
  { id: "perfil", label: "Mi perfil" },
  { id: "negocio", label: "Mi negocio" },
  { id: "facturacion", label: "Facturación" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function resolveTab(value: string | string[] | undefined, available: readonly { id: TabId }[]): TabId {
  return available.find((tab) => tab.id === value)?.id ?? "perfil";
}


export type SettingsTab = TabId;

/** Todo lo que necesita Ajustes. tenantSlug: cuando se abre desde otro producto, la cuenta que ese producto tiene abierta. */
export async function loadSettingsContext(rawTab: string | string[] | undefined, tenantSlug?: string) {
  let membership;
  let session;
  try {
    ({ membership, session } = await requireTenantRole(tenantRoles.MEMBER, tenantSlug));
  } catch {
    forbidden();
  }

  const dashboard = await getUnifiedTenantDashboard(membership.tenantId, session.user.id, session.user.platformRole);
  if (!dashboard) forbidden();

  const isOwner = membership.role === "OWNER";
  const labsActive = dashboard.modules.some((module) => module.key === "labs" && module.isActive);
  const profile = await prisma.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true } });
  const tabs = TABS.filter((item) => isOwner || item.id !== "facturacion");
  const tab = resolveTab(rawTab, tabs);
  // La primera vez que se abre Mi negocio se trae lo que la tienda de Business ya tenía.
  if (tab === "negocio" && isOwner) {
    const alreadyLoaded = await prisma.tenantBusinessInfo.findUnique({ where: { tenantId: membership.tenantId }, select: { id: true } });
    if (!alreadyLoaded && dashboard.modules.some((module) => module.key === "business" && module.isActive)) {
      await importBusinessProfileSeed(membership.tenantId).catch(() => false);
    }
  }
  const [businessInfo, branches, negocioBilling] =
    tab === "negocio"
      ? await Promise.all([
          prisma.tenantBusinessInfo.findUnique({ where: { tenantId: membership.tenantId } }),
          prisma.tenantBranch.findMany({ where: { tenantId: membership.tenantId }, orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }] }),
          prisma.tenantBillingProfile.findUnique({ where: { tenantId: membership.tenantId } }),
        ])
      : [null, [], null];
  // Cómo se conectan tus productos: qué productos tiene, de dónde sale cada cosa y, si algo sale de su
  // sistema de gestión, cómo está esa conexión (la trae Business).
  const activeProducts: Record<ProductKey, boolean> = {
    business: dashboard.modules.some((module) => module.key === "business" && module.isActive),
    labs: dashboard.modules.some((module) => module.key === "labs" && module.isActive),
    management: dashboard.modules.some((module) => module.key === "management" && module.isActive),
    rest: dashboard.modules.some((module) => module.key === "rest" && module.isActive),
  };
  const usesProducts = activeProducts.business || activeProducts.management || activeProducts.rest;
  const [managementContract, sourceRows] =
    tab === "negocio" && usesProducts
      ? await Promise.all([
          prisma.tenantManagementContract.findUnique({ where: { tenantId: membership.tenantId }, select: { integrationProvider: true } }),
          prisma.tenantDataSource.findMany({ where: { tenantId: membership.tenantId } }),
        ])
      : [null, []];
  const sources = Object.fromEntries(
    DATA_RESOURCES.map((resource) => [
      resource.id,
      sourceRows.find((row) => row.resource === resource.id)?.source ?? defaultSource(resource.id, activeProducts, managementContract?.integrationProvider ?? null),
    ]),
  ) as Record<DataResourceId, DataSourceId>;
  const externalSystem = sourceRows.find((row) => row.source === "EXTERNAL" && row.externalSystem)?.externalSystem ?? null;
  const usesExternal = Object.values(sources).includes("EXTERNAL");
  const connection = tab === "negocio" && usesProducts && usesExternal && activeProducts.business ? await getBusinessConnection(membership.tenantId) : null;
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

  return { membership, session, dashboard, isOwner, labsActive, profile, tabs, tab, businessInfo, branches, negocioBilling, usesProducts, activeProducts, sources, externalSystem, connection, paymentsEnabled, cards };
}

export type SettingsContext = Awaited<ReturnType<typeof loadSettingsContext>>;

const appOrigin = (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vase.ar").replace(/\/+$/, "");

/**
 * Pestañas y contenido de Ajustes. Lo usan la página de app y la versión que se ve adentro de otros
 * productos (embed): ahí los links que salen de Ajustes abren la ventana entera.
 */
export function SettingsBody({ ctx, tabHref, embed = false }: { ctx: SettingsContext; tabHref: (tab: TabId) => string; embed?: boolean }) {
  const { membership, session, isOwner, labsActive, profile, tabs, tab, businessInfo, branches, negocioBilling, usesProducts, activeProducts, sources, externalSystem, connection, paymentsEnabled, cards } = ctx;
  return (
    <>
      <div>
        <div className="vpa-seg" role="tablist" aria-label="Ajustes">
          {tabs.map((item) => (
            <Link
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              href={tabHref(item.id) as Route}
              className={tab === item.id ? "on" : ""}
            >
              {item.label}
            </Link>
          ))}
          {/* Cada producto suma su pestaña de Ajustes; la de Labs vive en labs.vase.ar. */}
          {labsActive && !embed ? (
            <a role="tab" aria-selected={false} href="https://labs.vase.ar/owner/settings">
              Labs
            </a>
          ) : null}
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
            <div style={{ marginTop: 16 }}>
              <ProfileNameField name={session.user.name ?? ""} email={session.user.email ?? ""} />
            </div>
            <div className="vpa-hrow" style={{ marginTop: 14 }}>
              <div className="vpa-g1">
                <b>Contraseña</b>
                <span>Te mandamos un correo para cambiarla</span>
              </div>
              <Link href={(embed ? `${appOrigin}/forgot-password` : "/forgot-password") as Route} target={embed ? "_top" : undefined} className="vpa-btn line sm">
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
          {isOwner && !embed ? <DeleteAccountDanger /> : null}
        </>
      ) : null}

      {tab === "negocio" ? (
        <BusinessProfile
          canEdit={isOwner}
          logoUrl={businessInfo?.logoUrl ?? null}
          socialLinks={
            Array.isArray(businessInfo?.socialLinks)
              ? (businessInfo.socialLinks as unknown as SocialLink[])
              : legacySocialLinks({
                  instagram: businessInfo?.instagram,
                  facebook: businessInfo?.facebook,
                  tiktok: businessInfo?.tiktok,
                  youtube: businessInfo?.youtube,
                })
          }
          values={{
            name: membership.tenant.name,
            industry: membership.tenant.industry,
            tagline: businessInfo?.tagline ?? "",
            timezone: businessInfo?.timezone ?? DEFAULT_TIMEZONE,
            currency: businessInfo?.currency ?? DEFAULT_CURRENCY,
            hours: businessInfo?.hours ?? "",
            city: negocioBilling?.city ?? "",
            province: negocioBilling?.province ?? "",
            postalCode: negocioBilling?.postalCode ?? "",
            phone: businessInfo?.phone ?? "",
            whatsapp: businessInfo?.whatsapp ?? "",
            email: businessInfo?.email ?? "",
            website: businessInfo?.website ?? "",
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

      {tab === "negocio" && usesProducts ? (
        <ConnectionsHub
          active={activeProducts}
          initial={sources}
          externalSystem={externalSystem}
          canEdit={isOwner}
          connection={<ExternalConnection connection={connection} canEdit={isOwner} systemName={externalSystem ?? "tu sistema"} />}
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
              <Link href={tabHref("negocio") as Route} className="vpa-btn line sm">
                Ir a Mi negocio
              </Link>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
