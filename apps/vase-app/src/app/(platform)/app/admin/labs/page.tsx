import { labsAdminTenantControlSchema } from "@vase/contracts";
import { forbidden } from "next/navigation";
import { LabsAdminWorkspace } from "@/components/admin/labs-admin-workspace";
import { AppShell } from "@/components/layout/app-shell";
import { requireVerifiedPlatformRole } from "@/lib/auth/guards";
import { listLabsAdminTenants } from "@/server/services/labs-admin";

export const dynamic = "force-dynamic";

export default async function LabsAdminPage() {
  let session;
  try {
    session = await requireVerifiedPlatformRole("SUPER_ADMIN");
  } catch {
    forbidden();
  }

  const controls = (await listLabsAdminTenants()).map((control) =>
    labsAdminTenantControlSchema.parse(control));

  return <AppShell
    title="Vase Labs"
    subtitle="Entitlements, límites por canal y sincronización operativa."
    currentUserName={session.user.name ?? session.user.email ?? "Admin Vase"}
  >
    <LabsAdminWorkspace initialControls={controls} />
  </AppShell>;
}
