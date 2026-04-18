import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { 
  FileText, 
  Globe, 
  Layout, 
  Settings, 
  BarChart3, 
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { SiteAppShell } from "@/components/layout/site-app-shell";
import { PanelCard } from "@/components/ui/panel-card";
import { StatusBadge } from "@/components/business/status-badge";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { getStorefrontBuilderData } from "@/server/queries/builder";

export default async function SiteDashboardPage({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  let membership;

  try {
    ({ membership } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const { pageId } = await params;
  const builder = await getStorefrontBuilderData(membership.tenantId, pageId);

  if (!builder) {
    notFound();
  }

  const primaryDomain = builder.page.domainConnections[0]?.hostname ?? `${builder.page.slug}.vase.ar`;

  return (
    <SiteAppShell
      title={builder.page.name}
      subtitle="Panel de control y rendimiento del sitio."
      tenantLabel={membership.tenant.name}
      pageId={pageId}
      siteName={builder.page.name}
      siteSlug={builder.page.slug}
    >
      <div className="grid gap-6">
        {/* Header de Estado */}
        <section className="overflow-hidden rounded-[32px] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-sm">
          <div className="flex flex-col gap-6 p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-[var(--accent-strong)] text-2xl font-bold text-[var(--accent-contrast)]">
                {builder.page.name.slice(0, 1).toUpperCase()}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="font-serif text-3xl tracking-tight text-[var(--foreground)]">
                    {builder.page.name}
                  </h2>
                  <StatusBadge tone="success" label={builder.page.status} />
                </div>
                <p className="flex items-center gap-2 text-sm text-[var(--muted)]">
                  <Globe className="size-4" />
                  {primaryDomain}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <a 
                href={`https://${primaryDomain}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center gap-2 rounded-full border border-[var(--border-subtle)] px-6 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] transition-colors"
              >
                Ver sitio en vivo
                <ExternalLink className="size-4" />
              </a>
              <Link
                href={`/app/owner/pages/${pageId}/editor`}
                className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--accent-strong)] px-8 text-sm font-semibold text-[var(--accent-contrast)] shadow-lg shadow-[var(--accent-soft)] hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Abrir editor visual
                <Layout className="size-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Módulos de Gestión */}
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <PanelCard
            eyebrow="Diseño"
            title="Editor Visual"
            description="Personaliza textos, imágenes y secciones de tu sitio web sin código."
            actions={
              <Link href={`/app/owner/pages/${pageId}/editor`} className="text-[var(--accent)]">
                <ChevronRight className="size-6" />
              </Link>
            }
          >
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              <FileText className="size-4" />
              {builder.page.versions.length} Versiones guardadas
            </div>
          </PanelCard>

          <PanelCard
            eyebrow="Infraestructura"
            title="Dominios"
            description="Asocia tu propio dominio .com o .ar para una marca profesional."
            actions={
              <Link href={`/app/owner/pages/${pageId}/domains`} className="text-[var(--accent)]">
                <ChevronRight className="size-6" />
              </Link>
            }
          >
             <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              <Globe className="size-4" />
              {builder.page.domainConnections.length > 0 ? "Conectado" : "Usando subdominio Vase"}
            </div>
          </PanelCard>

          <PanelCard
            eyebrow="Marketing"
            title="SEO y Social"
            description="Configura como se ve tu sitio en Google y redes sociales."
            actions={
              <Link href={`/app/owner/pages/${pageId}/editor`} className="text-[var(--accent)]">
                <ChevronRight className="size-6" />
              </Link>
            }
          >
            <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              <Settings className="size-4" />
              Meta tags definidos
            </div>
          </PanelCard>
        </section>

        {/* Sección de Analíticas Mock */}
        <PanelCard
          eyebrow="Resultados"
          title="Rendimiento del sitio"
          description="Estadísticas rápidas sobre el impacto de esta unidad de negocio."
        >
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-[color-mix(in_srgb,var(--surface-strong)_84%,white)] p-5">
              <div className="flex items-center gap-3 text-[var(--muted)]">
                <BarChart3 className="size-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Visitas</span>
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tighter">1,280</p>
              <p className="text-xs text-green-600 font-medium">+12.5% vs mes anterior</p>
            </div>
            <div className="rounded-2xl bg-[color-mix(in_srgb,var(--surface-strong)_84%,white)] p-5">
               <div className="flex items-center gap-3 text-[var(--muted)]">
                <BarChart3 className="size-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Conversión</span>
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tighter">3.2%</p>
              <p className="text-xs text-[var(--muted)]">Promedio industria: 2.1%</p>
            </div>
            <div className="rounded-2xl bg-[color-mix(in_srgb,var(--surface-strong)_84%,white)] p-5">
               <div className="flex items-center gap-3 text-[var(--muted)]">
                <BarChart3 className="size-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Solicitudes</span>
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tighter">42</p>
              <p className="text-xs text-[var(--muted)]">Nuevos contactos premium</p>
            </div>
            <div className="rounded-2xl bg-[color-mix(in_srgb,var(--surface-strong)_84%,white)] p-5">
               <div className="flex items-center gap-3 text-[var(--muted)]">
                <BarChart3 className="size-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Score SEO</span>
              </div>
              <p className="mt-2 text-3xl font-bold tracking-tighter">94/100</p>
              <p className="text-xs text-green-600 font-medium">Optimizado</p>
            </div>
          </div>
        </PanelCard>
      </div>
    </AppShell>
  );
}
