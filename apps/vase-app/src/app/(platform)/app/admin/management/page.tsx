import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ManagementControlCenter } from "@/components/admin/management-control-center";
import { platformRoles, requireVerifiedPlatformRole } from "@/lib/auth/guards";

export default async function AdminManagementPage() {
  try { await requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN); } catch { forbidden(); }
  return <AppShell title="Management" subtitle="Precio, en qué cuentas está prendido y quién lo usa" tenantLabel="Admin"><ManagementControlCenter /></AppShell>;
}
