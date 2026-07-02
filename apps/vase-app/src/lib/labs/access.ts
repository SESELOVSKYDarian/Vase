import { forbidden, redirect } from "next/navigation";
import type { Route } from "next";
import { productOrigins } from "@/config/origins";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import { getTenantModulesAccess } from "@/server/queries/modules";

export function buildLabsRequiredUrl(appOrigin = productOrigins.app) {
  return `${appOrigin}/app?labs=required`;
}

export async function requireLabsOwnerAccess() {
  let context: Awaited<ReturnType<typeof requireTenantRole>>;

  try {
    context = await requireTenantRole(tenantRoles.OWNER);
  } catch {
    forbidden();
  }

  const access = await getTenantModulesAccess(
    context.membership.tenantId,
    context.session.user.id,
  );
  const enabled =
    access?.modules.some(
      (module) => module.key === "labs" && module.isActive,
    ) ?? false;

  if (!enabled) {
    redirect(buildLabsRequiredUrl() as Route);
  }

  return context;
}
