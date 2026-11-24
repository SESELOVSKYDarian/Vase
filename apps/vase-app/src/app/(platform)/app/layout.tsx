import type { ReactNode } from "react";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { isAdminHost } from "@/lib/security/admin-host-routing";
import { isWorkspaceHost } from "@/lib/security/workspace-host-routing";
import { PanelFrame, type PanelFrameAccount } from "@/components/layout/client-shell/panel-frame";
import { TenantLogoProvider } from "@/components/layout/tenant-logo";
import "@vase/ui/panel.css";
import { prisma } from "@/lib/db/prisma";
import { getTenantMembership } from "@/lib/tenancy/resolve-tenant";
import { AppAnnouncements } from "@/components/announcements/announcement-modal";
import type { AnnouncementView } from "@/lib/announcements";
import { listAnnouncementsFor } from "@/server/services/announcements";

// Busca una vez, para todo el panel, el logo de Mi negocio y los datos de la cuenta que muestra el menú.
// Si algo falla, el panel sigue: sin logo usa la inicial y sin cuenta cada página dibuja su marco.
// productCount: cuántos productos distintos tiene activos. Con más de uno aparece el grupo Compartido.
// En admin.vase.ar y workspace.vase.ar trabaja el equipo: ahí no van los anuncios para clientes.
async function onPanelHost() {
  const list = await headers();
  const host = (list.get("x-forwarded-host") ?? list.get("host") ?? "").split(":")[0];
  return Boolean(host) && (isAdminHost(host) || isWorkspaceHost(host));
}

async function loadPanelAccount(): Promise<{ logoUrl: string | null; account: PanelFrameAccount | null; productCount: number; announcements: AnnouncementView[] }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { logoUrl: null, account: null, productCount: 0, announcements: [] };
    const membership = await getTenantMembership(session.user.id);
    if (!membership?.tenantId) return { logoUrl: null, account: null, productCount: 0, announcements: [] };
    const [info, modules, announcements] = await Promise.all([
      prisma.tenantBusinessInfo.findUnique({ where: { tenantId: membership.tenantId }, select: { logoUrl: true } }),
      prisma.tenantModule.findMany({ where: { tenantId: membership.tenantId, isActive: true }, select: { module: { select: { product: true } } } }),
      onPanelHost().then((panel) => (panel ? [] : listAnnouncementsFor("app", session.user.id))).catch(() => []),
    ]);
    const role = membership.role === "OWNER" || membership.role === "MANAGER" ? membership.role : "MEMBER";
    return {
      logoUrl: info?.logoUrl || null,
      account: { tenantLabel: membership.tenant.name, currentUserName: session.user.name ?? membership.tenant.name, viewerRole: role },
      productCount: new Set(modules.map((row) => row.module.product)).size,
      announcements,
    };
  } catch {
    return { logoUrl: null, account: null, productCount: 0, announcements: [] };
  }
}

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const { logoUrl, account, productCount, announcements } = await loadPanelAccount();
  return (
    <TenantLogoProvider logoUrl={logoUrl}>
      <PanelFrame account={account} productCount={productCount}>
        {children}
      </PanelFrame>
      <AppAnnouncements items={announcements} />
    </TenantLogoProvider>
  );
}
