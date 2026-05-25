import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { BusinessSitesWorkspace } from "@/components/business/business-sites-workspace";
import { PanelCard } from "@/components/ui/panel-card";
import { getEffectivePlan } from "@/lib/business/plans";
import { prisma } from "@/lib/db/prisma";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import { getBusinessOwnerDashboard, getUnifiedTenantDashboard } from "@/server/queries/dashboard";

function pageStatusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "ACTIVE") return "success";
  if (status === "TEMPORARY") return "warning";
  if (status === "EXPIRED" || status === "PENDING_REMOVAL") return "danger";
  return "neutral";
}

function buildGoogleCalendarUrl(input: { title: string; details: string; location: string; start: Date; end: Date }) {
  const fmt = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const query = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    details: input.details,
    location: input.location,
    dates: `${fmt(input.start)}/${fmt(input.end)}`,
    ctz: "America/Argentina/Buenos_Aires",
  });
  return `https://calendar.google.com/calendar/render?${query.toString()}`;
}

export default async function BusinessPage() {
  let membership;
  let session;
  try {
    ({ membership, session } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const [dashboard, shellDashboard, subscription, slots, upcomingBooking] = await Promise.all([
    getBusinessOwnerDashboard(membership.tenantId),
    getUnifiedTenantDashboard(membership.tenantId, session.user.id, session.user.platformRole),
    prisma.tenantSubscription.findUnique({ where: { tenantId: membership.tenantId } }).catch(() => null),
    prisma.meetingAvailabilitySlot.findMany({
      where: { tenantId: membership.tenantId, isActive: true, startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 20,
    }),
    prisma.customProjectMeetingBooking.findFirst({
      where: { tenantId: membership.tenantId, status: "SCHEDULED", scheduledStart: { gte: new Date() } },
      orderBy: { scheduledStart: "asc" },
      include: { customMeeting: { select: { meetingUrl: true } } },
    }),
  ]);
  if (!dashboard || !shellDashboard) forbidden();

  const effectivePlan = getEffectivePlan(subscription);
  const canCreatePage = dashboard.plan.plan === "PREMIUM" || dashboard.summary.activePages < (effectivePlan.businessProjectLimit ?? 1);
  const gcalUrl =
    upcomingBooking
      ? buildGoogleCalendarUrl({
          title: "Vase - Reunion de definicion",
          details: "Reunion de proyecto personalizado en Vase.",
          location: upcomingBooking.meetingUrl ?? upcomingBooking.customMeeting?.meetingUrl ?? "Vase",
          start: upcomingBooking.scheduledStart,
          end: upcomingBooking.scheduledEnd,
        })
      : null;

  return (
    <AppShell
      title="Workspace Business"
      subtitle="Gestiona tus sitios y dominios, y solicita paginas personalizadas con agenda integrada."
      tenantLabel={membership.tenant.name}
      currentUserName={session.user.name ?? membership.tenant.name}
      notifications={shellDashboard.notifications}
      modules={shellDashboard.modules}
      projectCreation={shellDashboard.projectCreation}
    >
      {upcomingBooking ? (
        <PanelCard
          eyebrow="Recordatorio de reunion"
          title="Tienes una reunion agendada"
          description={`Fecha: ${new Intl.DateTimeFormat("es-AR", { dateStyle: "full", timeStyle: "short" }).format(upcomingBooking.scheduledStart)}`}
        >
          {gcalUrl ? (
            <a href={gcalUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full border border-[var(--border-subtle)] px-5 text-sm font-semibold text-[var(--foreground)]">
              Agregar a Google Calendar
            </a>
          ) : null}
        </PanelCard>
      ) : null}

      <BusinessSitesWorkspace
        canCreatePage={canCreatePage}
        slots={slots}
        pages={dashboard.storefrontPages.map((page) => ({
          id: page.id,
          name: page.name,
          slug: page.slug,
          status: page.status,
          statusTone: pageStatusTone(page.status),
          isTemporary: page.isTemporary,
          lifecycleLabel: page.lifecycle.label,
          domains: page.domainConnections.map((domain) => domain.hostname),
        }))}
      />
    </AppShell>
  );
}
