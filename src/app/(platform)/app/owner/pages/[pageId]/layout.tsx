import Link from "next/link";
import { notFound, forbidden } from "next/navigation";
import { 
  ArrowLeft, 
  LayoutDashboard, 
  Paintbrush, 
  Globe, 
  Settings, 
  BarChart3,
  ExternalLink
} from "lucide-react";
import { AppShell, type NavItem } from "@/components/layout/app-shell";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { getStorefrontBuilderData } from "@/server/queries/builder";

export default async function SiteContextLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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

  // Definición de navegación específica del sitio
  const siteNavItems: NavItem[] = [
    { 
      id: "site-home", 
      href: `/app/owner/pages/${pageId}` as any, 
      label: "Portal del Sitio", 
      icon: LayoutDashboard 
    },
    { 
      id: "site-editor", 
      href: `/app/owner/pages/${pageId}/editor` as any, 
      label: "Editor Visual", 
      icon: Paintbrush 
    },
    { 
      id: "site-domains", 
      href: `/app/owner/pages/${pageId}/domains` as any, 
      label: "Configurar Dominio", 
      icon: Globe 
    },
    { 
      id: "site-seo", 
      href: `/app/owner/pages/${pageId}/editor` as any, // Provisionalmente al editor
      label: "Marketing y SEO", 
      icon: Settings 
    },
    { 
      id: "site-analytics", 
      href: `/app/owner/pages/${pageId}` as any, // Provisionalmente al portal
      label: "Vistas y Métricas", 
      icon: BarChart3 
    },
  ];

  const sidebarHeader = (
    <div className="space-y-4">
      <Link 
        href="/app/owner" 
        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--muted-soft)] hover:text-[var(--accent-strong)] transition-colors"
      >
        <ArrowLeft className="size-3" />
        Volver a Negocios
      </Link>
      
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[color:color-mix(in_srgb,var(--accent-strong)_12%,var(--background))] text-[var(--accent-strong)] border border-[color:color-mix(in_srgb,var(--accent-strong)_20%,transparent)]">
          <Globe className="size-5" />
        </div>
        <div className="flex flex-col min-w-0">
          <h2 className="truncate text-sm font-bold text-[var(--foreground)]">
            {builder.page.name}
          </h2>
          <a 
            href={`http://${builder.page.slug}.localhost:3000`} 
            target="_blank"
            className="flex items-center gap-1 text-[10px] text-[var(--muted)] hover:text-[var(--accent-strong)]"
          >
            Ver sitio público
            <ExternalLink className="size-2.5" />
          </a>
        </div>
      </div>
      
      <div className="h-px w-full bg-gradient-to-r from-[var(--border-subtle)] to-transparent" />
    </div>
  );

  return (
    <AppShell
      title={builder.page.name}
      subtitle={`Gestionando la presencia online de ${builder.page.name}`}
      tenantLabel={membership.tenant.name}
      customNavItems={siteNavItems}
      sidebarHeader={sidebarHeader}
    >
      {children}
    </AppShell>
  );
}
