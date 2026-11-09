import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ProductsGrid, type ProductsGridItem } from "@/components/panel/products-grid";
import {
  PANEL_PRODUCTS,
  panelProductHref,
  panelProductPriceLabel,
} from "@/components/panel/products";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";
import { getPanelPlanCatalog } from "@/server/queries/panel-plans";

export default async function ProductsPage() {
  let membership;
  let session;
  try {
    ({ membership, session } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const [dashboard, activeSubmodules, plansOf] = await Promise.all([
    getUnifiedTenantDashboard(membership.tenantId, session.user.id, session.user.platformRole),
    prisma.tenantSubmodule.findMany({
      where: { tenantId: membership.tenantId, isActive: true },
      select: { submodule: { select: { moduleId: true, name: true } } },
    }),
    getPanelPlanCatalog(),
  ]);
  if (!dashboard) forbidden();

  const items: ProductsGridItem[] = dashboard.modules.map((module) => {
    const product = PANEL_PRODUCTS[module.key];
    const currentPlan = activeSubmodules.find((row) => row.submodule.moduleId === module.id)?.submodule.name ?? null;
    const priceLabel = panelProductPriceLabel(module.billing);
    return {
      ...product,
      isActive: module.isActive,
      href: panelProductHref(module.key),
      currentPlan,
      priceLabel,
      footLabel: module.isActive ? (currentPlan ? `Plan ${currentPlan}` : "Activo") : priceLabel,
      plans: plansOf(module.id),
    };
  });

  return (
    <AppShell
      title="Mis productos"
      subtitle="Lo que tenés y lo que podés sumar"
      tenantLabel={membership.tenant.name}
      modules={dashboard.modules}
      notifications={dashboard.notifications}
      currentUserName={session.user.name ?? membership.tenant.name}
    >
      <ProductsGrid items={items} />
    </AppShell>
  );
}
