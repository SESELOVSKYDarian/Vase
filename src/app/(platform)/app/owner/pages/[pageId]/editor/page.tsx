import Link from "next/link";
import { forbidden, notFound } from "next/navigation";
import { SiteAppShell } from "@/components/layout/site-app-shell";
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
    <SiteAppShell
      title={`Editor de ${builder.page.name}`}
      subtitle="Diseña la experiencia visual de tu marca con el constructor de Vase."
      tenantLabel={membership.tenant.name}
      pageId={pageId}
      siteName={builder.page.name}
      siteSlug={builder.page.slug}
    >
      <PanelCard
        eyebrow="Builder"
        title="Editor visual de ecommerce"
        description="La experiencia esta pensada para que el owner pueda editar sin depender de una interfaz tecnica. El backend mantiene permisos, autosave y versionado."
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
