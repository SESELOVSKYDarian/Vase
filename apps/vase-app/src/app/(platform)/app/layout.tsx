import type { ReactNode } from "react";
import { auth } from "@/auth";
import { PanelFrame, type PanelFrameAccount } from "@/components/layout/client-shell/panel-frame";
import { TenantLogoProvider } from "@/components/layout/tenant-logo";
import "@vase/ui/panel.css";
import { prisma } from "@/lib/db/prisma";
import { getTenantMembership } from "@/lib/tenancy/resolve-tenant";

// Busca una vez, para todo el panel, el logo de Mi negocio y los datos de la cuenta que muestra el menú.
// Si algo falla, el panel sigue: sin logo usa la inicial y sin cuenta cada página dibuja su marco.
// productCount: cuántos productos distintos tiene activos. Con más de uno aparece el grupo Compartido.
async function loadPanelAccount(): Promise<{ logoUrl: string | null; account: PanelFrameAccount | null; productCount: number }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { logoUrl: null, account: null, productCount: 0 };
    const membership = await getTenantMembership(session.user.id);
    if (!membership?.tenantId) return { logoUrl: null, account: null, productCount: 0 };
    const [info, modules] = await Promise.all([
      prisma.tenantBusinessInfo.findUnique({ where: { tenantId: membership.tenantId }, select: { logoUrl: true } }),
      prisma.tenantModule.findMany({ where: { tenantId: membership.tenantId, isActive: true }, select: { module: { select: { product: true } } } }),
    ]);
    const role = membership.role === "OWNER" || membership.role === "MANAGER" ? membership.role : "MEMBER";
    return {
      logoUrl: info?.logoUrl || null,
      account: { tenantLabel: membership.tenant.name, currentUserName: session.user.name ?? membership.tenant.name, viewerRole: role },
      productCount: new Set(modules.map((row) => row.module.product)).size,
    };
  } catch {
    return { logoUrl: null, account: null, productCount: 0 };
  }
}

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const { logoUrl, account, productCount } = await loadPanelAccount();
  return (
    <TenantLogoProvider logoUrl={logoUrl}>
      <PanelFrame account={account} productCount={productCount}>
        {children}
      </PanelFrame>
    </TenantLogoProvider>
  );
}
