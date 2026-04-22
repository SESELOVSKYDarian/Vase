import { forbidden, redirect } from "next/navigation";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { BUSINESS_LAUNCH_PATH } from "@/lib/business/links";

export default async function StorefrontBuilderPage({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  try {
    await requireTenantRole(tenantRoles.OWNER);
  } catch {
    forbidden();
  }

  await params;
  redirect(BUSINESS_LAUNCH_PATH);
}
