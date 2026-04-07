import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PanelCard } from "@/components/ui/panel-card";
import { BuilderEditor } from "@/components/business/builder-editor";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { getStorefrontBuilderData } from "@/server/queries/builder";

export default async function StorefrontBuilderPage({
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

  return (
    <AppShell
      title={`Editor de ${builder.page.name}`}
      subtitle="Edita textos, imagenes, secciones y configuracion visual desde un builder simple, rapido y mantenible."
      tenantLabel={membership.tenant.name}
    >
      <PanelCard
        eyebrow="Builder"
        title="Editor visual de ecommerce"
        description="La experiencia esta pensada para que el owner pueda editar sin depender de una interfaz tecnica. El backend mantiene permisos, autosave y versionado."
        actions={
          <Link href="/app/owner" className="text-sm font-semibold text-[var(--accent)]">
            Volver al panel
          </Link>
        }
      >
        <BuilderEditor
          pageId={builder.page.id}
          pageName={builder.page.name}
          pageSlug={builder.page.slug}
          pageStatus={builder.page.status}
          initialDocument={builder.document}
          capabilities={builder.capabilities}
          versionHistory={builder.page.versions}
          requestHistory={builder.page.customPageRequests}
          domainConnections={builder.page.domainConnections}
          initialSavedAt={builder.page.builderLastSavedAt?.toISOString() ?? null}
        />
      </PanelCard>
    </AppShell>
  );
}
