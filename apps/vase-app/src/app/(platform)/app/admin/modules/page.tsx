import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AdminModulesConsole } from "@/components/admin/admin-modules-console";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { getAdminModulesCatalog } from "@/server/queries/modules-admin";

export default async function AdminModulesPage() {
  try {
    await requireAdminPermission(adminPermissions.MODULES);
  } catch {
    forbidden();
  }

  const modules = await getAdminModulesCatalog();

  return (
    <AppShell
      title="Business"
      subtitle="Los módulos de la tienda y en qué cuentas están prendidos"
      tenantLabel="Admin"
    >
      <AdminModulesConsole modules={modules} />
    </AppShell>
  );
}

