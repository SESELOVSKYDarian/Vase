import { AppShell } from "@/components/layout/app-shell";
import { ImagesBoard } from "@/components/panel/images-board";
import { loadSharedContext } from "@/lib/business/shared-context";
import { getSharedImages } from "@/server/services/business-shared";

/** Imágenes: todas las fotos de tu tienda (productos, páginas, logo y colores) y subida de fotos nuevas. */
export default async function ImagenesPage() {
  const { membership, session, dashboard, hasBusiness } = await loadSharedContext();
  const images = hasBusiness ? await getSharedImages(membership.tenantId) : null;

  return (
    <AppShell
      title="Imágenes"
      subtitle="Todas las fotos de tu tienda en un solo lugar"
      tenantLabel={membership.tenant.name}
      modules={dashboard.modules}
      notifications={dashboard.notifications}
      currentUserName={session.user.name ?? membership.tenant.name}
      viewerRole={membership.role}
    >
      {!hasBusiness ? (
        <div className="vpa-empty">Las fotos aparecen acá cuando tengas una tienda en Vase.</div>
      ) : images === null ? (
        <div className="vpa-empty">No pudimos traer tus imágenes. Probá de nuevo en un rato.</div>
      ) : (
        <ImagesBoard images={images.items} />
      )}
    </AppShell>
  );
}
