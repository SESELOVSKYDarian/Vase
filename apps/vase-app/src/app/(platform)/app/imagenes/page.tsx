import type { Route } from "next";
import { forbidden, redirect } from "next/navigation";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

/**
 * Imágenes vive en "Tu plan y espacio" de cada web. Este enlace (lo usa el aviso de Business) lleva a la
 * pestaña Imágenes de tu web; si no tenés ninguna, a Tus webs.
 */
export default async function ImagenesPage() {
  let membership;
  try {
    ({ membership } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }
  const page = await prisma.storefrontPage.findFirst({
    where: { tenantId: membership.tenantId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  redirect((page ? `/app/owner/pages/${page.id}/plan?tab=imagenes` : "/app/business") as Route);
}
