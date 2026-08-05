import { forbidden } from "next/navigation";
import { AdminMasterUsersWorkspace } from "@/components/admin/admin-master-users-workspace";
import { AppShell } from "@/components/layout/app-shell";
import { platformRoles, requireVerifiedPlatformRole } from "@/lib/auth/guards";
import { getAdminUsersWorkspaceData } from "@/server/queries/admin-users";

export default async function AdminUsersPage() {
  try {
    await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN);
  } catch {
    forbidden();
  }

  const workspaceData = await getAdminUsersWorkspaceData();

  return (
    <AppShell
      title="Usuarios"
      subtitle="Panel unificado de usuarios, acceso por módulo y cobros del cliente."
      tenantLabel="Admin Master"
    >
      <AdminMasterUsersWorkspace {...workspaceData} />
    </AppShell>
  );
}
