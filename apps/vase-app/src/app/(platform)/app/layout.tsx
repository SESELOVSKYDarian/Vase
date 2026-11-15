import type { ReactNode } from "react";
import { auth } from "@/auth";
import { PanelFrame, type PanelFrameAccount } from "@/components/layout/client-shell/panel-frame";
import { TenantLogoProvider } from "@/components/layout/tenant-logo";
import "@vase/ui/panel.css";
import { prisma } from "@/lib/db/prisma";
import { getTenantMembership } from "@/lib/tenancy/resolve-tenant";

// Busca una vez, para todo el panel, el logo de Mi negocio y los datos de la cuenta que muestra el menú.
// Si algo falla, el panel sigue: sin logo usa la inicial y sin cuenta cada página dibuja su marco.
async function loadPanelAccount(): Promise<{ logoUrl: string | null; account: PanelFrameAccount | null }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { logoUrl: null, account: null };
    const membership = await getTenantMembership(session.user.id);
    if (!membership?.tenantId) return { logoUrl: null, account: null };
    const info = await prisma.tenantBusinessInfo.findUnique({ where: { tenantId: membership.tenantId }, select: { logoUrl: true } });
    const role = membership.role === "OWNER" || membership.role === "MANAGER" ? membership.role : "MEMBER";
    return {
      logoUrl: info?.logoUrl || null,
      account: { tenantLabel: membership.tenant.name, currentUserName: session.user.name ?? membership.tenant.name, viewerRole: role },
    };
  } catch {
    return { logoUrl: null, account: null };
  }
}

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const { logoUrl, account } = await loadPanelAccount();
  return (
    <TenantLogoProvider logoUrl={logoUrl}>
      <PanelFrame account={account}>{children}</PanelFrame>
    </TenantLogoProvider>
  );
}
