import { AppShell } from "@/components/layout/app-shell";
import { CatalogSource } from "@/components/panel/catalog-source";
import { prisma } from "@/lib/db/prisma";
import { loadSharedContext } from "@/lib/business/shared-context";

/**
 * Catálogo compartido: la misma pantalla de Catálogo de Business (tabla, panel lateral al tocar un producto,
 * ofertas y precios), mostrada adentro de app. Se edita igual que en Business.
 */
export default async function CatalogoPage() {
  const { membership, session, dashboard, hasBusiness, hasManagement } = await loadSharedContext();
  const isOwner = membership.role === "OWNER";
  const sourceRow = hasBusiness
    ? null
    : await prisma.tenantDataSource.findUnique({ where: { tenantId_resource: { tenantId: membership.tenantId, resource: "CATALOG" } } });

  return (
    <AppShell
      title="Catálogo"
      subtitle="Productos, categorías, marcas, ofertas y precios"
      tenantLabel={membership.tenant.name}
      modules={dashboard.modules}
      notifications={dashboard.notifications}
      currentUserName={session.user.name ?? membership.tenant.name}
      viewerRole={membership.role}
    >
      {hasBusiness ? (
        <iframe
          title="Catálogo"
          src={`/app/business/launch?section=catalogo&embed=1&tenant=${encodeURIComponent(membership.tenant.slug)}`}
          className="vpa-embedframe"
        />
      ) : (
        <CatalogSource
          hasManagement={hasManagement}
          canEdit={isOwner}
          currentSystem={sourceRow?.source === "EXTERNAL" ? sourceRow.externalSystem : null}
          connection={null}
        />
      )}
    </AppShell>
  );
}
