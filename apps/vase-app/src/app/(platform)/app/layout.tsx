import type { ReactNode } from "react";
import { auth } from "@/auth";
import { TenantLogoProvider } from "@/components/layout/tenant-logo";
import { prisma } from "@/lib/db/prisma";
import { getTenantMembership } from "@/lib/tenancy/resolve-tenant";

// Busca el logo de Mi negocio una vez para todo el panel. Si algo falla, el panel sigue con la inicial.
async function loadTenantLogo() {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;
    const membership = await getTenantMembership(session.user.id);
    if (!membership?.tenantId) return null;
    const info = await prisma.tenantBusinessInfo.findUnique({ where: { tenantId: membership.tenantId }, select: { logoUrl: true } });
    return info?.logoUrl || null;
  } catch {
    return null;
  }
}

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const logoUrl = await loadTenantLogo();
  return <TenantLogoProvider logoUrl={logoUrl}>{children}</TenantLogoProvider>;
}
