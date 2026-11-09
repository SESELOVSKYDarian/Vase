import { forbidden } from "next/navigation";
import { TeamHome } from "@/components/panel/team-home";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";

export default async function ManagerPage() {
  let membership;
  let session;

  try {
    ({ membership, session } = await requireTenantRole(tenantRoles.MANAGER));
  } catch {
    forbidden();
  }

  const dashboard = await getUnifiedTenantDashboard(membership.tenantId, session.user.id, session.user.platformRole);
  if (!dashboard) forbidden();

  return (
    <TeamHome
      role="MANAGER"
      tenantName={membership.tenant.name}
      userName={session.user.name ?? membership.tenant.name}
      modules={dashboard.modules}
      notifications={dashboard.notifications}
    />
  );
}
