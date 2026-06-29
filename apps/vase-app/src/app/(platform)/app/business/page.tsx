import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { BusinessSitesWorkspace } from "@/components/business/business-sites-workspace";
import { PanelCard } from "@/components/ui/panel-card";
import { getEffectivePlan } from "@/lib/business/plans";
import { prisma } from "@/lib/db/prisma";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import { getBusinessOwnerDashboard, getUnifiedTenantDashboard } from "@/server/queries/dashboard";
import { getClientV2Dashboard } from "@/server/queries/v2-dashboards";

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

  const [dashboard, shellDashboard, clientDashboard, subscription, slots, upcomingBooking, businessSubmoduleAccess] = await Promise.all([
    getBusinessOwnerDashboard(membership.tenantId),
    getUnifiedTenantDashboard(membership.tenantId, session.user.id, session.user.platformRole),
    getClientV2Dashboard(membership.tenantId),
    prisma.tenantSubscription.findUnique({ where: { tenantId: membership.tenantId } }).catch(() => null),
    prisma.meetingAvailabilitySlot.findMany({
      where: { tenantId: membership.tenantId, isActive: true, endsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 20,
    }),
    prisma.customProjectMeetingBooking.findFirst({
      where: { tenantId: membership.tenantId, status: "SCHEDULED", scheduledStart: { gte: new Date() } },
      orderBy: { scheduledStart: "asc" },
      include: { customMeeting: { select: { meetingUrl: true } } },
    }),
    prisma.moduleSubmodule.findMany({
      where: { moduleId: "vase_business", isActive: true },
      select: {
        key: true,
        tenantLinks: {
          where: { tenantId: membership.tenantId },
          select: { isActive: true },
          take: 1,
        },
      },
    }),
  ]);
  if (!dashboard || !shellDashboard) forbidden();
  if (!shellDashboard.modules.some((module) => module.key === "business" && module.isActive)) {
    forbidden();
  }

  const effectivePlan = getEffectivePlan(subscription);
  const hasExplicitBusinessSubmoduleAccess = businessSubmoduleAccess.some((submodule) => submodule.tenantLinks.length > 0);
  const canUseTemplateFlow =
    !hasExplicitBusinessSubmoduleAccess ||
    businessSubmoduleAccess.some((submodule) => submodule.key === "plantilla" && submodule.tenantLinks.some((link) => link.isActive));
  const canUseCustomFlow =
    !hasExplicitBusinessSubmoduleAccess ||
    businessSubmoduleAccess.some((submodule) => submodule.key === "personalizado" && submodule.tenantLinks.some((link) => link.isActive));
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

      <section className="grid gap-4 md:grid-cols-3">
        <PanelCard title="Proyecto principal" description="Estado y avance general.">
          {clientDashboard.project ? (
            <div className="grid gap-1 text-sm text-[var(--muted)]">
              <p className="font-semibold text-[var(--foreground)]">{clientDashboard.project.name}</p>
              <p>Estado: {clientDashboard.project.status}</p>
              <p>Progreso: {clientDashboard.project.progressPercent}%</p>
              <p>Última actualización: {new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(clientDashboard.project.lastUpdatedAt)}</p>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">Sin proyecto activo aún.</p>
          )}
        </PanelCard>

        <PanelCard title="Próxima reunión" description="Fecha, hora y acceso rápido.">
          {clientDashboard.nextMeeting ? (
            <div className="grid gap-2 text-sm text-[var(--muted)]">
              <p>{new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(clientDashboard.nextMeeting.startsAt)}</p>
              {clientDashboard.nextMeeting.meetUrl ? (
                <a className="text-sm font-semibold text-[var(--accent)]" href={clientDashboard.nextMeeting.meetUrl} target="_blank" rel="noreferrer">
                  Abrir Meet
                </a>
              ) : (
                <p>Sin link cargado aún.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">Sin reuniones próximas.</p>
          )}
        </PanelCard>

        <PanelCard title="Pagos pendientes" description="Estado de cobranzas y vencimientos.">
          <div className="grid gap-1 text-sm text-[var(--muted)]">
            <p>Cantidad: <span className="font-semibold text-[var(--foreground)]">{clientDashboard.payments.pendingCount}</span></p>
            <p>Próximo vencimiento: <span className="font-semibold text-[var(--foreground)]">{clientDashboard.payments.nextDueAt ? new Intl.DateTimeFormat("es-AR", { dateStyle: "short" }).format(clientDashboard.payments.nextDueAt) : "Sin fecha"}</span></p>
          </div>
        </PanelCard>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <PanelCard title="Tickets" description="Seguimiento de soporte.">
          <div className="grid gap-1 text-sm text-[var(--muted)]">
            <p>Abiertos: <span className="font-semibold text-[var(--foreground)]">{clientDashboard.tickets.openCount}</span></p>
            <p>Esperando respuesta interna: <span className="font-semibold text-[var(--foreground)]">{clientDashboard.tickets.waitingResponseCount}</span></p>
          </div>
        </PanelCard>
        <PanelCard title="Presupuestos" description="Pendientes de aprobación del cliente.">
          <p className="text-3xl font-semibold text-[var(--foreground)]">{clientDashboard.budgets.pendingApprovalCount}</p>
        </PanelCard>
        <PanelCard title="Últimas novedades" description="Timeline cronológico reciente.">
          <div className="grid gap-2">
            {clientDashboard.timeline.length ? clientDashboard.timeline.slice(0, 4).map((item) => (
              <article key={item.id} className="rounded-lg border border-[var(--border-subtle)] px-2 py-1">
                <p className="text-xs font-semibold text-[var(--foreground)]">{item.title}</p>
                <p className="text-[11px] text-[var(--muted)]">{new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(item.at)}</p>
              </article>
            )) : <p className="text-sm text-[var(--muted)]">Sin novedades recientes.</p>}
          </div>
        </PanelCard>
      </section>

      <BusinessSitesWorkspace
        canCreatePage={canCreatePage}
        canUseTemplateFlow={canUseTemplateFlow}
        canUseCustomFlow={canUseCustomFlow}
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
