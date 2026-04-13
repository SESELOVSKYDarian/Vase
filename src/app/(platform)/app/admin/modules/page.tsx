import Link from "next/link";
import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StatusBadge } from "@/components/business/status-badge";
import { AdminModuleCreateForm } from "@/components/admin/admin-module-create-form";
import { AdminModuleForm } from "@/components/admin/admin-module-form";
import { AdminModulePricingForm } from "@/components/admin/admin-module-pricing-form";
import { PanelCard } from "@/components/ui/panel-card";
import { platformRoles, requireVerifiedPlatformRole } from "@/lib/auth/guards";
import { getAdminModulesCatalog } from "@/server/queries/modules-admin";
import { MODULE_ICON_MAP } from "@/config/modules";

function productTone(product: string) {
  return product === "BUSINESS" ? "info" : "premium";
}

function pricingTypeLabel(type?: string | null) {
  return type === "one_time" ? "Unico" : "Mensual";
}

export default async function AdminModulesPage() {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
  } catch {
    forbidden();
  }

  const modules = await getAdminModulesCatalog();
  const activeModules = modules.filter((module) => module.isActive);

  return (
    <AppShell
      title="Gestion de modulos y pricing"
      subtitle="Administra catalogo, estado y pricing real de los modulos SaaS de Vase desde una sola vista maestra."
      tenantLabel="Vision global de monetizacion"
    >
      <PanelCard
        eyebrow="Monetizacion"
        title="Catalogo modular administrable"
        description="El pricing visible en la plataforma debe venir de base de datos. Esta consola te permite gestionar modulos, pricing actual y base para activacion futura por tenant."
        actions={
          <Link href="/app/admin" className="text-sm font-semibold text-[var(--accent)]">
            Volver al admin
          </Link>
        }
      >
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
            <p className="text-sm text-[var(--muted)]">Modulos</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{modules.length}</p>
          </div>
          <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
            <p className="text-sm text-[var(--muted)]">Activos</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">{activeModules.length}</p>
          </div>
          <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
            <p className="text-sm text-[var(--muted)]">Business</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
              {modules.filter((module) => module.product === "BUSINESS").length}
            </p>
          </div>
          <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
            <p className="text-sm text-[var(--muted)]">Labs</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--foreground)]">
              {modules.filter((module) => module.product === "LABS").length}
            </p>
          </div>
        </div>
      </PanelCard>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <PanelCard
          eyebrow="Nuevo modulo"
          title="Crear entrada de catalogo"
          description="Puedes registrar nuevos modulos sin tocar el dashboard. Luego podras asignarlos y monetizarlos por tenant."
        >
          <AdminModuleCreateForm />
        </PanelCard>

        <PanelCard
          eyebrow="Base dinamica"
          title="Pricing listo para crecer"
          description="Cada modulo mantiene versionado de precios, fallback desde config y soporte futuro para activacion granular por tenant y calculo dinamico."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
              `Module` concentra identidad, producto, ruta y estado operativo.
            </div>
            <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
              `ModulePricing` versiona precio, moneda y modalidad mensual o unica.
            </div>
            <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
              `TenantModule` prepara activacion real por tenant y calculo de totales futuros.
            </div>
          </div>
        </PanelCard>
      </section>

      <PanelCard
        eyebrow="Catalogo"
        title="Modulos y pricing actual"
        description="Edita metadata y cambia pricing activo sin hardcodear valores en frontend."
      >
        <div className="space-y-6">
          <div className="hidden grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr] gap-4 rounded-2xl bg-[color-mix(in_srgb,var(--surface-strong)_88%,transparent)] px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted-soft)] xl:grid">
            <span>Modulo</span>
            <span>Producto</span>
            <span>Precio</span>
            <span>Tipo</span>
            <span>Estado</span>
          </div>

          {modules.map((module) => {
            const key = module.id.startsWith("vase_business") ? "business" : "labs";
            const Icon = MODULE_ICON_MAP[key as keyof typeof MODULE_ICON_MAP];

            return (
              <div
                key={module.id}
                className="grid gap-5 rounded-[28px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_92%,transparent)] p-5"
              >
                <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr] xl:items-center">
                  <div className="flex items-start gap-4">
                    <div className="grid size-12 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                      {Icon ? <Icon className="size-5" /> : null}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-[var(--foreground)]">{module.name}</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                        {module.description ?? "Sin descripcion cargada."}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted-soft)]">
                        {module.route}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center xl:justify-start">
                    <StatusBadge tone={productTone(module.product)} label={module.product} />
                  </div>

                  <div className="text-sm text-[var(--foreground)]">
                    {module.currentPricing
                      ? `${module.currentPricing.currency} ${module.currentPricing.price.toFixed(2)}`
                      : "Sin pricing"}
                  </div>

                  <div className="text-sm text-[var(--foreground)]">
                    {pricingTypeLabel(module.currentPricing?.type)}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone={module.isActive ? "success" : "neutral"} label={module.isActive ? "Activo" : "Inactivo"} />
                    <StatusBadge tone="info" label={`${module.activeTenants} tenants`} />
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-2">
                  <AdminModuleForm
                    moduleId={module.id}
                    name={module.name}
                    description={module.description}
                    route={module.route}
                    isActive={module.isActive}
                  />
                  <AdminModulePricingForm
                    moduleId={module.id}
                    price={module.currentPricing?.price}
                    currency={module.currentPricing?.currency}
                    type={module.currentPricing?.type}
                    isActive={module.currentPricing?.isActive ?? true}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </PanelCard>
    </AppShell>
  );
}
