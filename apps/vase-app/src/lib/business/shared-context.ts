import { forbidden } from "next/navigation";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";

/** Catálogo, Clientes y Pedidos compartidos: los ven el Dueño y los Encargados. */
export async function loadSharedContext() {
  let membership;
  let session;
  try {
    ({ membership, session } = await requireTenantRole(tenantRoles.MANAGER));
  } catch {
    forbidden();
  }
  const dashboard = await getUnifiedTenantDashboard(membership.tenantId, session.user.id, session.user.platformRole);
  if (!dashboard) forbidden();
  const active = dashboard.modules.filter((module) => module.isActive);
  const has = (key: string) => active.some((module) => module.key === key);
  return { membership, session, dashboard, active, hasBusiness: has("business"), hasLabs: has("labs"), hasManagement: has("management") };
}

// Colores de cada producto en las etiquetas de "dónde se usa".
export const PRODUCT_COLORS: Record<string, string> = {
  business: "#079455",
  labs: "#7a5af8",
  management: "#f79009",
  rest: "#e04f16",
};

export function formatShortDate(value: string | Date | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(date);
}
