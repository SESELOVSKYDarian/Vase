import { SiteAppShell } from "@/components/layout/site-app-shell";

export default async function SiteDomainsPage({
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

  const canUseCustomDomain = builder.plan.canUseCustomDomain;

  return (
    <SiteAppShell
      title={`Dominios de ${builder.page.name}`}
      subtitle="Conecta tu marca con una URL propia y profesional."
      tenantLabel={membership.tenant.name}
      pageId={pageId}
      siteName={builder.page.name}
      siteSlug={builder.page.slug}
    >

      <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
        {/* Formulario e Instrucciones */}
        <div className="space-y-6">
          <PanelCard
            eyebrow="Configuración"
            title="Vincular nuevo dominio"
            description="Una vez registrado el dominio aquí, deberás configurar tus DNS para que apunten a nuestra infraestructura."
          >
            <DomainConnectionForm 
              pageId={pageId} 
              canUseCustomDomain={canUseCustomDomain} 
            />
          </PanelCard>
        </div>

        {/* Lista de Dominios Actuales */}
        <div className="space-y-6">
          <PanelCard
            eyebrow="Estado"
            title="Dominios vinculados"
            description="Estado de la conexión y seguridad de tus dominios actuales."
          >
            <div className="space-y-4">
              {builder.page.domainConnections.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-8 text-center">
                  <Globe className="mx-auto size-8 text-[var(--muted-soft)]" />
                  <p className="mt-2 text-sm text-[var(--muted)]">No hay dominios personalizados conectados.</p>
                </div>
              ) : (
                builder.page.domainConnections.map((conn) => (
                  <div 
                    key={conn.id}
                    className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-[var(--foreground)]">{conn.hostname}</p>
                      <StatusBadge 
                        tone={conn.status === "ACTIVE" ? "success" : "warning"} 
                        label={conn.status} 
                      />
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-xs text-[var(--muted)]">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="size-3.5 text-green-600" />
                        SSL: Automático
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        Agregado el {new Date(conn.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}

              {/* Dominio Default de Vase */}
              <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-strong)]/30 p-5 space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted-soft)]">Subdominio Vase (Default)</p>
                <div className="flex items-center justify-between">
                  <p className="font-medium text-[var(--muted)]">{builder.page.slug}.vase.ar</p>
                  <StatusBadge tone="neutral" label="ACTIVO" />
                </div>
              </div>
            </div>
          </PanelCard>

          <PanelCard
            eyebrow="Soporte"
            title="¿Necesitas ayuda?"
            description="Si no sabes cómo configurar tus DNS, nuestro equipo de soporte puede ayudarte con la delegación."
          >
             <button className="w-full min-h-11 rounded-full border border-[var(--border-subtle)] text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-strong)] transition-colors">
                Contactar soporte técnico
             </button>
          </PanelCard>
        </div>
      </div>
    </AppShell>
  );
}
