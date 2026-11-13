import { forbidden } from "next/navigation";
import { EmbedFrame } from "@/components/layout/embed-frame";
import { EmbeddedNotifications } from "@/components/layout/embedded-notifications";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";

export const dynamic = "force-dynamic";

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

/**
 * Las notificaciones de tu cuenta de Vase para mostrar adentro de Business, Labs y el resto de los
 * productos: las mismas que en app. tenant: la cuenta que el producto tiene abierta.
 */
export default async function EmbeddedNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = await searchParams;
  const tenant = one(query.tenant).trim().slice(0, 80) || undefined;
  const theme = one(query.theme) === "dark" ? "dark" : "light";
  let membership;
  let session;
  try {
    ({ membership, session } = await requireTenantRole(tenantRoles.MEMBER, tenant));
  } catch {
    forbidden();
  }
  const dashboard = await getUnifiedTenantDashboard(membership.tenantId, session.user.id, session.user.platformRole);
  if (!dashboard) forbidden();

  return (
    <EmbedFrame theme={theme}>
      <EmbeddedNotifications notifications={dashboard.notifications} />
    </EmbedFrame>
  );
}
