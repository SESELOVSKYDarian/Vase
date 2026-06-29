import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AnalyticsOverview } from "@/components/analytics/analytics-overview";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";
import { getTenantAnalytics } from "@/server/queries/analytics";

export default async function AnalyticsPage() {
  let membership;
  let session;
  try {
    ({ membership, session } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const [dashboard, analytics] = await Promise.all([
    getUnifiedTenantDashboard(membership.tenantId, session.user.id, session.user.platformRole),
    getTenantAnalytics(membership.tenantId, 30),
  ]);

  if (!dashboard) forbidden();

  return (
    <AppShell
      title="Analiticas de tu negocio"
      subtitle="Numeros y tendencias clave para decidir rapido."
      tenantLabel={membership.tenant.name}
      modules={dashboard.modules}
      notifications={dashboard.notifications}
      currentUserName={session.user.name ?? membership.tenant.name}
      projectCreation={dashboard.projectCreation}
    >
      <AnalyticsOverview
        salesToday={analytics.summary.salesToday}
        leadsToday={analytics.summary.leadsToday}
        conversationsToday={analytics.summary.conversationsToday}
        ticketsToday={analytics.summary.ticketsToday}
        domainsConnectedLast30Days={analytics.summary.domainsConnectedLast30Days}
        channelsConnectedLast30Days={analytics.summary.channelsConnectedLast30Days}
        salesSeries={analytics.series.sales}
        leadsSeries={analytics.series.leads}
        connectedDomainsSeries={analytics.series.connectedDomains}
        connectedChannelsSeries={analytics.series.connectedChannels}
        ordersByStatus={analytics.ordersByStatus}
      />
    </AppShell>
  );
}
