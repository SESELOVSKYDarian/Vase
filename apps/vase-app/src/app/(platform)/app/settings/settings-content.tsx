import Link from "next/link";
import type { Route } from "next";
import { forbidden } from "next/navigation";
import { CreditCard, Sparkles, Store, UserRound } from "lucide-react";
import { PanelSettingsTabs, type SettingsTabItem } from "@vase/ui/panel";
import { BillingCards } from "@/components/panel/billing-cards";
import { AvatarUploader } from "@/components/panel/avatar-uploader";
import { ThemePicker } from "@/components/panel/theme-picker";
import { BusinessProfile } from "@/components/panel/business-profile";
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
  { id: "labs", label: "Labs" },
] as const;

// Lo que se ve en cada pestaña: ícono y una línea de qué hay adentro.
const TAB_DETAILS: Record<string, Pick<SettingsTabItem, "hint" | "icon" | "info">> = {
  perfil: { hint: "Tus datos y apariencia", icon: <UserRound size={18} /> },
  negocio: {
    hint: "Datos, sucursales y conexiones",
    icon: <Store size={18} />,
    info: "Lo cargás una vez y lo usan todos tus productos. Si cambiás algo acá, se actualiza en todos lados.",
  },
  facturacion: { hint: "Medios de pago y facturas", icon: <CreditCard size={18} /> },
  labs: { hint: "Plan de uso, canales e IA", icon: <Sparkles size={18} /> },
};

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
  // Facturación y Labs son del Dueño; Labs aparece solo si la cuenta tiene Labs.
  const tabs = TABS.filter((item) => (isOwner || (item.id !== "facturacion" && item.id !== "labs")) && (item.id !== "labs" || labsActive));
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

  return { membership, session, dashboard, isOwner, labsActive, profile, tabs, tab, businessInfo, branches, negocioBilling, paymentsEnabled, cards };
}

export type SettingsContext = Awaited<ReturnType<typeof loadSettingsContext>>;

const appOrigin = (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vase.ar").replace(/\/+$/, "");

/**
 * Pestañas y contenido de Ajustes. Lo usan la página de app y la versión que se ve adentro de otros
 * productos (embed): ahí los links que salen de Ajustes abren la ventana entera.
 */
export function SettingsBody({ ctx, tabHref, embed = false, hideTabs = false }: { ctx: SettingsContext; tabHref: (tab: TabId) => string; embed?: boolean; hideTabs?: boolean }) {
  const { membership, session, isOwner, profile, tabs, tab, paymentsEnabled, cards } = ctx;
  return (
    <>
      {/* Si el producto que lo muestra ya tiene sus propias pestañas (Labs), acá no se repiten. */}
      <div hidden={hideTabs}>
        <PanelSettingsTabs
          // En app, Ajustes es solo Mi perfil y Facturación: Mi negocio tiene su sección en el menú y lo de
          // Labs vive en Labs › Configuraciones. Adentro de otro producto sigue la pestaña Mi negocio.
          items={tabs.filter((item) => item.id !== "labs" && (embed || item.id !== "negocio")).map((item) => ({ id: item.id, label: item.label, href: tabHref(item.id), ...TAB_DETAILS[item.id] }))}
          active={tab}
          renderLink={({ href, className, children, ariaCurrent }) => (
            <Link href={href as Route} className={className} aria-current={ariaCurrent}>
              {children}
            </Link>
          )}
        />
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

      {tab === "negocio" ? <NegocioBody ctx={ctx} /> : null}

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
              <Link href={(embed ? tabHref("negocio") : "/app/negocio") as Route} className="vpa-btn line sm">
                Ir a Mi negocio
              </Link>
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}

/** Mi negocio: datos, contacto, sucursales y datos fiscales. Lo usan la sección de app y la pestaña embebida. */
export function NegocioBody({ ctx }: { ctx: SettingsContext }) {
  const { membership, isOwner, businessInfo, branches, negocioBilling } = ctx;
  return (
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
  );
}
