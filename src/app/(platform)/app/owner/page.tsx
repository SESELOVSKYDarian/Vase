import type { Route } from "next";
import Link from "next/link";
import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PanelCard } from "@/components/ui/panel-card";
import { MetricCard } from "@/components/business/metric-card";
import { ClientCustomQuoteResponseForm } from "@/components/business/client-custom-quote-response-form";
import { StatusBadge } from "@/components/business/status-badge";
import { CreatePageForm } from "@/components/business/create-page-form";
import { CustomPageRequestForm } from "@/components/business/custom-page-form";
import { DomainRequestForm } from "@/components/business/domain-request-form";
import { PremiumRequestForm } from "@/components/business/premium-request-form";
import { getProductPanelCopy } from "@/lib/auth/redirects";
import { formatMoneyFromCents, getQuoteStatusLabel, getQuoteStatusTone } from "@/lib/business/custom-quotes";
import { getBillingLabel, getPlanLabel } from "@/lib/business/plans";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { getBusinessOwnerDashboard } from "@/server/queries/dashboard";

function pageStatusTone(status: string) {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "TEMPORARY":
      return "warning";
    case "EXPIRED":
    case "PENDING_REMOVAL":
      return "danger";
    default:
      return "neutral";
  }
}

function domainStatusTone(status: string) {
  switch (status) {
    case "CONNECTED":
      return "success";
    case "PENDING_VERIFICATION":
      return "warning";
    case "PENDING_PAYMENT":
      return "premium";
    case "FAILED":
      return "danger";
    default:
      return "neutral";
  }
}

export default async function OwnerPage() {
  let session;
  let membership;

  try {
    ({ membership, session } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const dashboard = await getBusinessOwnerDashboard(membership.tenantId);
  const productCopy = getProductPanelCopy(membership.tenant.onboardingProduct);
  const businessEnabled =
    membership.tenant.onboardingProduct === "BUSINESS" ||
    membership.tenant.onboardingProduct === "BOTH";
  const canCreatePage = businessEnabled;
  const canUseCustomDomain = dashboard.plan.limits.canUseCustomDomain;

  return (
    <AppShell
      title={productCopy.title}
      subtitle={`${productCopy.subtitle} Desde aqui puedes administrar ecommerce, paginas, dominios, plan e integraciones.`}
      tenantLabel={membership.tenant.name}
    >
      {!session.user.isEmailVerified ? (
        <PanelCard
          eyebrow="Verificacion pendiente"
          title="Confirma tu email para habilitar acciones sensibles"
          description="Ya creamos tu tenant y tu sesion. Para proteger tu negocio, algunas operaciones de alto impacto requieren identidad verificada."
          actions={
            <Link href="/verify-email" className="text-sm font-semibold text-[var(--accent)]">
              Verificar ahora
            </Link>
          }
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
              Tenant: {membership.tenant.accountName}
            </div>
            <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
              Industria: {membership.tenant.industry}
            </div>
            <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
              Producto activo: {membership.tenant.onboardingProduct}
            </div>
          </div>
        </PanelCard>
      ) : null}

      {!businessEnabled ? (
        <PanelCard
          eyebrow="Modulo no activo"
          title="Vase Business aun no esta activado en este tenant"
          description="Tu cuenta fue creada para VaseLabs o para otra combinacion. Puedes solicitar activacion de Business cuando quieras."
        >
          <PremiumRequestForm />
        </PanelCard>
      ) : (
        <>
          <section id="resumen" className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Resumen"
              value={dashboard.summary.totalPages}
              note="Paginas totales dentro del tenant."
            />
            <MetricCard
              label="Mis paginas"
              value={dashboard.summary.activePages}
              note="Paginas activas o visibles para operar."
            />
            <MetricCard
              label="Dominio"
              value={dashboard.summary.connectedDomains}
              note="Dominios propios ya conectados."
            />
            <MetricCard
              label="Integraciones API"
              value={dashboard.featureFlags.filter((flag) => flag.enabled).length}
              note="Feature flags e integraciones habilitadas."
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <PanelCard
              eyebrow="Estado del plan"
              title="Tu operacion actual"
              description="Aqui puedes ver limites, premium, facturacion y condiciones para dominio propio."
              actions={
                <StatusBadge
                  tone={dashboard.plan.plan === "PREMIUM" ? "premium" : "info"}
                  label={getPlanLabel(dashboard.plan.plan)}
                />
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
                  <p className="text-sm text-[var(--muted)]">Facturacion</p>
                  <div className="mt-3">
                    <StatusBadge tone="info" label={getBillingLabel(dashboard.plan.billingStatus)} />
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                    Limite de paginas: {dashboard.plan.limits.maxPages}. Dominio propio:{" "}
                    {canUseCustomDomain ? "habilitado" : "requiere premium"}.
                  </p>
                </div>
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
                  <p className="text-sm text-[var(--muted)]">Paginas temporales</p>
                  <div className="mt-3">
                    <StatusBadge
                      tone={dashboard.plan.temporaryPagesEnabled ? "success" : "neutral"}
                      label={dashboard.plan.temporaryPagesEnabled ? "Permitidas" : "No disponibles"}
                    />
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                    Las paginas temporales duran 30 dias. Si no se pagan o conectan correctamente,
                    entran en una gracia de 7 dias y luego deben eliminarse.
                  </p>
                </div>
              </div>
              {dashboard.plan.plan !== "PREMIUM" ? (
                <div className="mt-6 rounded-3xl border border-[color-mix(in_srgb,var(--warning)_24%,transparent)] bg-[var(--warning-soft)] p-5">
                  <p className="font-semibold text-[var(--foreground)]">Opcion premium</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    Premium habilita dominio propio, mas capacidad, solicitudes avanzadas y una
                    operacion mas flexible.
                  </p>
                  <div className="mt-4">
                    <PremiumRequestForm />
                  </div>
                </div>
              ) : null}
            </PanelCard>

            <PanelCard
              eyebrow="Configuracion"
              title="Datos del negocio"
              description="Informacion base del tenant para administrar el ecommerce conectado con tu negocio."
            >
              <div className="grid gap-4">
                <div className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-5">
                  <p className="text-sm text-[var(--muted)]">Nombre del negocio</p>
                  <p className="mt-2 font-semibold text-[var(--foreground)]">{membership.tenant.name}</p>
                </div>
                <div className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-5">
                  <p className="text-sm text-[var(--muted)]">Cuenta</p>
                  <p className="mt-2 font-semibold text-[var(--foreground)]">{membership.tenant.accountName}</p>
                </div>
                <div className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-5">
                  <p className="text-sm text-[var(--muted)]">Rubro</p>
                  <p className="mt-2 font-semibold text-[var(--foreground)]">{membership.tenant.industry}</p>
                </div>
              </div>
            </PanelCard>
          </section>

          {membership.tenant.onboardingProduct === "BOTH" ? (
            <PanelCard
              eyebrow="VaseLabs activo"
              title="Tu tenant tambien tiene IA y chatbot"
              description="Ademas del ecommerce, ya puedes configurar conocimiento, scraping controlado, canales y escalamiento humano desde el modulo Labs."
              actions={
                <Link href="/app/owner/labs" className="text-sm font-semibold text-[var(--accent)]">
                  Abrir panel VaseLabs
                </Link>
              }
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
                  Carga FAQs, archivos y URLs permitidas para entrenar el asistente.
                </div>
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
                  Conecta canales como WhatsApp, webchat e Instagram segun el plan.
                </div>
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
                  Configura tono, horarios, limites y derivacion a humano con UX guiada.
                </div>
              </div>
            </PanelCard>
          ) : null}

          <section className="space-y-8 rounded-[32px] border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_94%,white)] p-8 shadow-[0_24px_48px_rgba(25,28,27,0.05)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-soft)]">
                  Sitios y dominios
                </p>
                <h2 className="font-serif text-4xl tracking-[-0.04em] text-[var(--foreground)]">
                  Multiples webs dentro de Vase Business
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-[var(--muted)]">
                  Cada entrada funciona como un sitio independiente: puedes crear nuevas webs, asociarles
                  dominios distintos, entrar a su editor visual y preparar su propia conexion operativa.
                </p>
              </div>
              <Link
                href="#crear-pagina"
                className="inline-flex min-h-11 items-center rounded-full bg-[var(--accent-strong)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
              >
                Nueva pagina
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-[1.6fr_0.8fr_0.8fr]">
              <div className="flex min-h-14 items-center gap-3 rounded-full border border-[var(--border-subtle)] bg-white px-5 shadow-sm">
                <span className="text-sm text-[var(--muted)]">Buscar por nombre, slug o etiqueta...</span>
              </div>
              <div className="flex min-h-14 items-center justify-between rounded-full border border-[var(--border-subtle)] bg-white px-5 shadow-sm">
                <span className="text-sm font-medium text-[var(--foreground)]">Estado: Todas</span>
                <span className="text-[var(--muted)]">+</span>
              </div>
              <div className="flex min-h-14 items-center justify-between rounded-full border border-[var(--border-subtle)] bg-white px-5 shadow-sm">
                <span className="text-sm font-medium text-[var(--foreground)]">Ordenar: Reciente</span>
                <span className="text-[var(--muted)]">+</span>
              </div>
            </div>

            {dashboard.storefrontPages.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-[var(--border-subtle)] bg-white p-8 text-sm leading-7 text-[var(--muted)]">
                Aun no tienes paginas creadas. Usa la seccion siguiente para generar la primera.
              </div>
            ) : (
              <div className="overflow-hidden rounded-[30px] border border-[var(--border-subtle)] bg-white shadow-sm">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-[color-mix(in_srgb,var(--surface-strong)_60%,white)] text-[var(--muted-soft)]">
                      <th className="px-8 py-5 text-xs font-semibold uppercase tracking-[0.2em]">Nombre de pagina</th>
                      <th className="px-6 py-5 text-center text-xs font-semibold uppercase tracking-[0.2em]">Estado</th>
                      <th className="px-6 py-5 text-center text-xs font-semibold uppercase tracking-[0.2em]">Dominio</th>
                      <th className="px-6 py-5 text-xs font-semibold uppercase tracking-[0.2em]">Operacion</th>
                      <th className="px-8 py-5 text-right text-xs font-semibold uppercase tracking-[0.2em]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {dashboard.storefrontPages.map((page) => (
                      <tr key={page.id} className="group transition hover:bg-[color-mix(in_srgb,var(--surface)_96%,white)]">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--surface-strong)_84%,white)] text-sm font-semibold text-[var(--foreground)]">
                              {page.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-serif text-xl text-[var(--foreground)]">{page.name}</p>
                              <p className="text-xs text-[var(--muted)]">/{page.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <div className="inline-flex justify-center">
                            <StatusBadge tone={pageStatusTone(page.status)} label={page.status} />
                          </div>
                        </td>
                        <td className="px-6 py-6 text-center">
                          {page.domainConnections.length > 0 ? (
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-[var(--foreground)]">
                                {page.domainConnections[0]?.hostname}
                              </div>
                              <div className="text-xs text-[var(--muted)]">
                                {page.domainConnections.length > 1
                                  ? `+${page.domainConnections.length - 1} dominio(s)`
                                  : "Dominio principal"}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex min-h-8 items-center rounded-full bg-[color-mix(in_srgb,var(--surface-strong)_68%,white)] px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                              Sin dominio
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-6">
                          <div className="text-sm font-medium text-[var(--foreground)]">
                            {page.isTemporary ? "Sitio temporal" : "Sitio estable"}
                          </div>
                          <div className="text-xs text-[var(--muted)]">{page.lifecycle.label}</div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex justify-end gap-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                            <Link
                              href={`/app/owner/integrations/api?site=${page.id}` as Route}
                              className="inline-flex min-h-10 items-center rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--foreground)]"
                            >
                              Gestion
                            </Link>
                            <Link
                              href={`/app/owner/pages/${page.id}` as Route}
                              className="inline-flex min-h-10 items-center rounded-full border border-[var(--border-subtle)] px-4 text-sm font-semibold text-[var(--foreground)]"
                            >
                              Editar
                            </Link>
                            <Link
                              href={`/app/owner/pages/${page.id}` as Route}
                              className="inline-flex min-h-10 items-center rounded-full bg-[var(--accent-strong)] px-4 text-sm font-semibold text-[var(--accent-contrast)]"
                            >
                              Abrir editor
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex flex-col gap-4 border-t border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_38%,white)] px-8 py-5 md:flex-row md:items-center md:justify-between">
                  <span className="text-xs font-medium text-[var(--muted)]">
                    Mostrando {dashboard.storefrontPages.length} pagina{dashboard.storefrontPages.length === 1 ? "" : "s"} activas en este tenant
                  </span>
                  <div className="flex gap-2">
                    <button className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--muted)]">
                      {"<"}
                    </button>
                    <button className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-strong)] text-xs font-bold text-[var(--accent-contrast)]">
                      1
                    </button>
                    <button className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] text-xs font-medium text-[var(--muted)]">
                      2
                    </button>
                    <button className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--muted)]">
                      {">"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <PanelCard
              eyebrow="Builder"
              title="Edita tu ecommerce sin complejidad tecnica"
              description="Cada pagina tiene un editor visual con bloques, autosave, versionado simple, preview responsive y solicitud de personalizacion completa."
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-5">
                  <p className="font-semibold text-[var(--foreground)]">Textos e imagenes</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    Cambia copys, URLs de imagen y estructura por bloque sin tocar codigo.
                  </p>
                </div>
                <div className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-5">
                  <p className="font-semibold text-[var(--foreground)]">Preview responsive</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    Revisa rapidamente la vista desktop y mobile antes de publicar.
                  </p>
                </div>
                <div className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-5">
                  <p className="font-semibold text-[var(--foreground)]">Premium a medida</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    Si necesitas una personalizacion total, puedes escalarla al equipo Vase.
                  </p>
                </div>
              </div>
            </PanelCard>

            <div id="crear-pagina">
              <PanelCard
                eyebrow="Crear nueva pagina"
                title="Publica una nueva pagina para tu ecommerce"
                description="Puedes crear paginas estables o temporales. Las temporales viven 30 dias y luego entran en gracia por 7 dias."
              >
                <CreatePageForm canCreate={canCreatePage} />
              </PanelCard>
            </div>

            <PanelCard
              eyebrow="Solicitar pagina personalizada"
              title="Pide una plantilla muy personalizada"
              description="Completa el formulario con objetivos, alcance e integraciones para que el equipo prepare una propuesta premium."
            >
              <CustomPageRequestForm />
            </PanelCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <PanelCard
              eyebrow="Dominio"
              title="Conecta dominios por sitio"
              description="Cada web puede tener su propio dominio. Selecciona el sitio correcto y deja separado el despliegue de cada marca o unidad de negocio."
            >
              <DomainRequestForm
                disabled={!canUseCustomDomain}
                pages={dashboard.storefrontPages.map((page) => ({
                  id: page.id,
                  name: page.name,
                }))}
              />
            </PanelCard>

            <PanelCard
              eyebrow="Facturacion"
              title="Estado de plan y pagos"
              description="Visualiza rapidamente si estas en trial, activo, pendiente o cancelado y que implica para tu ecommerce."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
                  <p className="text-sm text-[var(--muted)]">Plan actual</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                    {getPlanLabel(dashboard.plan.plan)}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    Paginas activas permitidas: {dashboard.plan.limits.maxPages}
                  </p>
                </div>
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
                  <p className="text-sm text-[var(--muted)]">Estado de cobro</p>
                  <div className="mt-3">
                    <StatusBadge tone="info" label={getBillingLabel(dashboard.plan.billingStatus)} />
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
                    Si una pagina temporal vence y no se regulariza, queda 7 dias en gracia.
                  </p>
                </div>
              </div>
            </PanelCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <PanelCard
              eyebrow="Integraciones API"
              title="Conecta el ecommerce con tu negocio"
              description="Estas integraciones ayudan a unir paginas, stock, operaciones y servicios internos."
            >
              <div className="grid gap-4">
                <div className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-5">
                  <p className="font-semibold text-[var(--foreground)]">Catalogo y stock</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    Prepara sincronizacion con tu gestion para productos, disponibilidad y estados.
                  </p>
                </div>
                <div className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-5">
                  <p className="font-semibold text-[var(--foreground)]">Pedidos y estados</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    Lista para conectar flujos de ordenes, fulfillment y seguimiento.
                  </p>
                </div>
                <div className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-5">
                  <p className="font-semibold text-[var(--foreground)]">Documentacion</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                    Usa la API de Vase para integrar tus sistemas existentes sin rehacer procesos.
                  </p>
                  <Link href="/developers/api" className="mt-3 inline-flex text-sm font-semibold text-[var(--accent)]">
                    Ir a API Docs
                  </Link>
                  <Link
                    href={"/app/owner/integrations/api" as Route}
                    className="mt-2 inline-flex text-sm font-semibold text-[var(--accent)]"
                  >
                    Gestionar credenciales privadas
                  </Link>
                </div>
              </div>
            </PanelCard>

            <PanelCard
              eyebrow="Feature flags"
              title="Funciones habilitadas"
              description="Visibilidad simple sobre modulos y capacidades activas en tu tenant."
            >
              <div className="grid gap-3">
                {dashboard.featureFlags.map((flag) => (
                  <div
                    key={flag.id}
                    className="flex items-center justify-between rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-4"
                  >
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">{flag.key}</p>
                      <p className="text-sm leading-6 text-[var(--muted)]">
                        {flag.description ?? "Sin descripcion adicional."}
                      </p>
                    </div>
                    <StatusBadge tone={flag.enabled ? "success" : "neutral"} label={flag.enabled ? "Activo" : "Inactivo"} />
                  </div>
                ))}
              </div>
            </PanelCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <PanelCard
              eyebrow="Solicitudes premium"
              title="Pedidos de pagina muy personalizada"
              description="Seguimiento claro de pedidos, presupuestos, tiempos estimados y respuesta del cliente."
              actions={
                <Link href="/app/owner/customizations" className="text-sm font-semibold text-[var(--accent)]">
                  Ver detalle completo
                </Link>
              }
            >
              {dashboard.customPageRequests.length === 0 ? (
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-6 text-sm leading-7 text-[var(--muted)]">
                  Aun no registraste solicitudes personalizadas.
                </div>
              ) : (
                <div className="grid gap-3">
                  {dashboard.customPageRequests.map((request) => (
                    <div key={request.id} className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <p className="font-semibold text-[var(--foreground)]">{request.pageScope}</p>
                        <StatusBadge tone="premium" label={request.status} />
                      </div>
                      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                        {request.businessObjective}
                      </p>
                      {request.quote ? (
                        <div className="mt-4 grid gap-3 rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold text-[var(--foreground)]">{request.quote.quoteNumber}</p>
                              <p className="text-sm text-[var(--muted)]">
                                {formatMoneyFromCents(
                                  request.quote.totalAmountCents,
                                  request.quote.currency,
                                )}{" "}
                                · {request.quote.estimatedDeliveryDays} dias estimados
                              </p>
                            </div>
                            <StatusBadge
                              tone={getQuoteStatusTone(request.quote.status)}
                              label={getQuoteStatusLabel(request.quote.status)}
                            />
                          </div>
                          {request.quote.status === "PENDING_CLIENT" ? (
                            <ClientCustomQuoteResponseForm quoteId={request.quote.id} />
                          ) : null}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                          Todavia no hay presupuesto asociado. El equipo Vase sigue revisando el pedido.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </PanelCard>

            <PanelCard
              eyebrow="Dominio"
              title="Estado de dominios conectados"
              description="Control claro del estado de cada dominio propio y del sitio al que pertenece."
            >
              {dashboard.domainConnections.length === 0 ? (
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-6 text-sm leading-7 text-[var(--muted)]">
                  Todavia no hay dominios propios registrados.
                </div>
              ) : (
                <div className="grid gap-3">
                  {dashboard.domainConnections.map((domain) => (
                    <div key={domain.id} className="flex items-center justify-between gap-4 rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-5">
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">{domain.hostname}</p>
                        <p className="text-sm leading-6 text-[var(--muted)]">
                          {domain.verifiedAt
                            ? "Verificado y disponible para conectar."
                            : "Pendiente de completar el flujo."}
                        </p>
                        <p className="text-xs text-[var(--muted-soft)]">
                          {domain.storefrontPageId
                            ? `Asignado a un sitio del tenant`
                            : "Dominio sin sitio asignado"}
                        </p>
                      </div>
                      <StatusBadge tone={domainStatusTone(domain.status)} label={domain.status} />
                    </div>
                  ))}
                </div>
              )}
            </PanelCard>
          </section>
        </>
      )}
    </AppShell>
  );
}
