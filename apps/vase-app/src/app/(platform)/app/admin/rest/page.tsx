import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import {
  RestAdminWorkspace,
  type RestContractTenantView,
  type RestOperationsView,
  type RestPricingView,
} from "@/components/admin/rest-admin-workspace";
import { requireVerifiedPlatformRole } from "@/lib/auth/guards";
import { getRestAdminOperations, listRestAdminData } from "@/server/services/rest-admin";

export const dynamic = "force-dynamic";

export default async function RestAdminPage() {
  let session;
  try {
    session = await requireVerifiedPlatformRole("SUPER_ADMIN");
  } catch {
    forbidden();
  }

  const [commercialResult, operationsResult] = await Promise.allSettled([
    listRestAdminData(),
    getRestAdminOperations(),
  ]);
  const commercial = commercialResult.status === "fulfilled"
    ? commercialResult.value
    : { versions: [], contractTenants: [] };
  const operations: RestOperationsView = operationsResult.status === "fulfilled"
    ? operationsResult.value
    : { health: "unavailable", tenants: [], edges: [] };

  return <AppShell
    title="Rest"
    subtitle="Planes, cuentas con Rest y cómo están funcionando"
    currentUserName={session.user.name ?? session.user.email ?? "Admin Vase"}
  >
    <RestAdminWorkspace
      initialVersions={commercial.versions as RestPricingView[]}
      initialContractTenants={commercial.contractTenants as RestContractTenantView[]}
      initialOperations={operations}
    />
  </AppShell>;
}
