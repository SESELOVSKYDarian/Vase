import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ModulesDashboard } from "@/components/platform/modules-dashboard";
import { DashboardSupportWidget } from "@/components/support/dashboard-support-widget";
import { requireUser } from "@/lib/auth/guards";
import { getTenantMembership } from "@/lib/tenancy/resolve-tenant";
import { prisma } from "@/lib/db/prisma";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";
import { getTenantSupportWidgetContext } from "@/server/queries/support";

export default async function AppIndexPage() {
  const session = await requireUser();

  if (session.user.platformRole === "SUPER_ADMIN") {
    redirect("/app/admin");
  }

  if (session.user.platformRole === "SUPPORT") {
    redirect("/app/support");
  }

  const membership = await getTenantMembership(session.user.id);

  if (!membership) {
    redirect("/signin");
  }

  switch (membership.role) {
    case "OWNER": {
      const [dashboard, supportWidget, user] = await Promise.all([
        getUnifiedTenantDashboard(membership.tenantId, session.user.id),
        getTenantSupportWidgetContext(membership.tenantId),
        prisma.user.findUnique({ where: { id: session.user.id }, ...(({ select: { shortcuts: true } }) as any) }),
      ]);

      if (!dashboard) {
        redirect("/signin");
      }

      return (
        <AppShell
          title="Modules Dashboard"
          subtitle="Un solo punto de entrada para los productos activos del tenant. Desde aqui puedes abrir Vase Business, Vase Labs y futuras capacidades modulares."
          tenantLabel={membership.tenant.name}
          modules={dashboard.modules}
          notifications={dashboard.notifications}
          shortcuts={(user?.shortcuts as any) ?? []}
          supportWidget={
            <DashboardSupportWidget
              tenantName={membership.tenant.name}
              conversationOptions={supportWidget.conversationOptions}
              supportSummary={supportWidget.summary}
            />
          }
        >
          <ModulesDashboard actorName={session.user.name} dashboard={dashboard} />
        </AppShell>
      );
    }
    case "MANAGER":
      redirect("/app/manager");
    default:
      redirect("/app/member");
  }
}
