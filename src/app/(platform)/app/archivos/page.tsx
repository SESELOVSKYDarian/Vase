import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardSupportWidget } from "@/components/support/dashboard-support-widget";
import { requireUser } from "@/lib/auth/guards";
import { getTenantMembership } from "@/lib/tenancy/resolve-tenant";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";
import { UploadsClient } from "./uploads-client";

async function getPageContext() {
  try {
    const session = await requireUser();
    const membership = await getTenantMembership(session.user.id);

    if (!membership) {
      forbidden();
    }

    const dashboard = await getUnifiedTenantDashboard(membership.tenantId, session.user.id);

    if (!dashboard) {
      forbidden();
    }

    return { membership, dashboard };
  } catch {
    forbidden();
  }
}

export default async function ArchivosPage() {
  const { membership, dashboard } = await getPageContext();

  return (
    <AppShell
      title="Mis archivos"
      subtitle="Subi imagenes, videos y PDFs privados desde tu cuenta de Vase. Cada usuario trabaja sobre su propia carpeta en uploads.vase.ar."
      tenantLabel={membership.tenant.name}
      modules={dashboard.modules}
      notifications={dashboard.notifications}
      supportWidget={<DashboardSupportWidget />}
    >
      <UploadsClient />
    </AppShell>
  );
}
