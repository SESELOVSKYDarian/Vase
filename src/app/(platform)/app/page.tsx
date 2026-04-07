import type { Route } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { getTenantMembership } from "@/lib/tenancy/resolve-tenant";

export default async function AppIndexPage() {
  const session = await requireUser();

  if (session.user.platformRole === "SUPER_ADMIN") {
    redirect("/app/admin");
  }

  if (session.user.platformRole === "SUPPORT") {
    redirect("/app/support" as Route);
  }

  const membership = await getTenantMembership(session.user.id);

  if (!membership) {
    redirect("/signin");
  }

  switch (membership.role) {
    case "OWNER":
      if (membership.tenant.onboardingProduct === "LABS" || membership.tenant.onboardingProduct === "BOTH") {
        redirect("/app/owner/labs");
      }

      redirect("/app/owner");
    case "MANAGER":
      redirect("/app/manager");
    default:
      redirect("/app/member");
  }
}
