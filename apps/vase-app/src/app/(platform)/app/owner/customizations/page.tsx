import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { WorkBoard, type BoardMeeting, type BoardSlot, type WorkItem } from "@/components/panel/work-board";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import { formatMoneyFromCents } from "@/lib/business/custom-quotes";
import { BUSINESS_WORKSPACE_PATH } from "@/lib/business/links";
import { prisma } from "@/lib/db/prisma";
import {
  describeWorkProgress,
  formatCalendarTile,
  formatMeetingDayMonth,
  formatMeetingTime,
  formatMeetingWhen,
  formatSlotDay,
  meetingMinutes,
  mergeClientMeetings,
  type ClientMeetingSource,
} from "@/lib/business/work-board";
import { getTenantCustomizationQuoteWorkspace } from "@/server/queries/custom-quotes";
import { getUnifiedTenantDashboard } from "@/server/queries/dashboard";

const dateLabel = new Intl.DateTimeFormat("es-AR", { dateStyle: "long" });

const REQUEST_KIND: Record<string, string> = {
  TEMPLATE_CUSTOMIZATION: "Personalizar plantilla",
  FULL_CUSTOMIZATION: "Desarrollo a medida",
};

const MEETING_LABEL: Record<string, string> = {
  DEFINITION: "Definición",
  DESIGN: "Diseño",
  MID_DEVELOPMENT: "Avance del desarrollo",
  FINAL_DELIVERY: "Entrega final",
  FOLLOW_UP: "Seguimiento",
};

export default async function OwnerCustomizationsPage() {
  let membership;
  let session;

  try {
    ({ membership, session } = await requireTenantRole(tenantRoles.MANAGER));
  } catch {
    forbidden();
  }

  const tenantId = membership.tenantId;
  const [workspace, dashboard, meetingsV2, bookings, slots] = await Promise.all([
    getTenantCustomizationQuoteWorkspace(tenantId),
    getUnifiedTenantDashboard(tenantId, session.user.id, session.user.platformRole),
    prisma.meetingV2.findMany({
      where: { tenantId, scheduledAt: { not: null } },
      orderBy: { scheduledAt: "desc" },
      take: 40,
      select: { id: true, title: true, meetUrl: true, scheduledAt: true, sourceCustomMeetingId: true },
    }),
    prisma.customProjectMeetingBooking.findMany({
      where: { tenantId },
      orderBy: { scheduledStart: "desc" },
      take: 40,
      select: {
        id: true,
        status: true,
        scheduledStart: true,
        scheduledEnd: true,
        meetingUrl: true,
        customMeetingId: true,
        customPageRequest: { select: { pageScope: true } },
        customMeeting: { select: { meetingUrl: true } },
      },
    }),
    prisma.meetingAvailabilitySlot.findMany({
      where: {
        tenantId,
        isActive: true,
        startsAt: { gte: new Date() },
        reservedCount: { lt: prisma.meetingAvailabilitySlot.fields.capacity },
      },
      orderBy: { startsAt: "asc" },
      take: 8,
      select: { id: true, startsAt: true },
    }),
  ]);

  const isOwner = membership.role === "OWNER";
  const nowMs = new Date().getTime();
  const items: WorkItem[] = workspace.requests.map((request) => {
    const total = request.quote ? formatMoneyFromCents(request.quote.totalAmountCents, request.quote.currency) : null;
    const pendingClient = request.quote?.status === "PENDING_CLIENT";
    return {
      id: request.id,
      title: request.pageScope,
      description: request.businessDescription ?? request.businessObjective,
      product: "Vase Business",
      kind: REQUEST_KIND[request.requestType] ?? "Otro",
      createdAt: request.createdAt,
      createdLabel: dateLabel.format(request.createdAt),
      progress: isOwner
        ? describeWorkProgress({ status: request.status, quoteStatus: request.quote?.status, quoteAmount: total })
        : {
            ...describeWorkProgress({ status: request.status, quoteStatus: request.quote?.status }),
            ...(pendingClient ? { next: "El presupuesto lo revisa el Dueño", state: "Esperando al Dueño" } : {}),
          },
      awaitingOwner: pendingClient && !isOwner,
      detail: pendingClient && request.quote ? `Entrega estimada en ${request.quote.estimatedDeliveryDays} días` : "",
      meetings: request.meetings.map((meeting) => ({
        id: meeting.id,
        type: meeting.type,
        typeLabel: MEETING_LABEL[meeting.type] ?? "Reunión",
        status: meeting.status,
        isEnabledByAdmin: meeting.isEnabledByAdmin,
        requestedDate: meeting.requestedDate,
        confirmedDate: meeting.confirmedDate,
        when: meeting.confirmedDate ?? meeting.scheduledStart ?? meeting.requestedDate,
        url: meeting.meetingUrl,
      })),
      // El Encargado no ve importes: ni siquiera se le envían al navegador.
      quote: request.quote && isOwner
        ? {
            id: request.quote.id,
            number: request.quote.quoteNumber,
            total: total ?? "",
            summary: request.quote.clientSummary,
            validUntil: request.quote.validUntil ? dateLabel.format(request.quote.validUntil) : "Sin fecha",
            pendingClient,
            lines: request.quote.lineItems.map((line) => ({
              id: line.id,
              label: line.label,
              description: line.description,
              total: formatMoneyFromCents(line.totalAmountCents, request.quote!.currency),
            })),
          }
        : null,
    };
  });

  const now = new Date(nowMs);
  const sources: ClientMeetingSource[] = [
    ...bookings
      .filter((booking) => booking.status !== "CANCELED")
      .map((booking) => ({
        id: booking.id,
        kind: "booking" as const,
        title: booking.customPageRequest.pageScope,
        start: booking.scheduledStart,
        end: booking.scheduledEnd,
        url: booking.meetingUrl ?? booking.customMeeting?.meetingUrl ?? null,
        finished: booking.status === "COMPLETED",
        customMeetingId: booking.customMeetingId,
      })),
    ...meetingsV2.map((meeting) => ({
      id: meeting.id,
      kind: "v2" as const,
      title: meeting.title,
      start: meeting.scheduledAt as Date,
      end: null,
      url: meeting.meetUrl,
      finished: false,
      customMeetingId: meeting.sourceCustomMeetingId,
    })),
    ...workspace.requests.flatMap((request) =>
      request.meetings.flatMap((meeting) => {
        const start = meeting.confirmedDate ?? meeting.scheduledStart ?? meeting.requestedDate;
        if (!start || meeting.status === "CANCELED") return [];
        return [
          {
            id: meeting.id,
            kind: "request" as const,
            title: `${MEETING_LABEL[meeting.type] ?? "Reunión"} · ${request.pageScope}`,
            start,
            end: meeting.scheduledEnd,
            url: meeting.meetingUrl,
            finished: meeting.status === "COMPLETED",
            customMeetingId: meeting.id,
          },
        ];
      }),
    ),
  ];
  const merged = mergeClientMeetings(sources, now);
  const toBoard = (meeting: ClientMeetingSource): BoardMeeting => {
    const minutes = meetingMinutes(meeting.start, meeting.end);
    const tile = formatCalendarTile(meeting.start);
    return {
      id: meeting.id,
      kind: meeting.kind,
      title: meeting.title,
      when: formatMeetingWhen(meeting.start, now),
      dayLabel: formatMeetingDayMonth(meeting.start),
      duration: minutes ? `${minutes} minutos` : null,
      month: tile.month,
      day: tile.day,
      url: meeting.url,
      atMs: meeting.start.getTime(),
    };
  };
  const boardSlots: BoardSlot[] = slots.map((slot) => ({
    id: slot.id,
    day: formatSlotDay(slot.startsAt),
    time: formatMeetingTime(slot.startsAt),
  }));

  return (
    <AppShell
      title="Trabajos a medida"
      subtitle="Lo que le pediste a Vase y tus reuniones"
      tenantLabel={membership.tenant.name}
      modules={dashboard?.modules}
      notifications={dashboard?.notifications}
      currentUserName={session.user.name ?? membership.tenant.name}
      viewerRole={membership.role}
    >
      <WorkBoard items={items} nowMs={nowMs} upcomingMeetings={merged.upcoming.map(toBoard)} pastMeetings={merged.past.map(toBoard)} slots={boardSlots} newRequestHref={isOwner ? BUSINESS_WORKSPACE_PATH : null} />
    </AppShell>
  );
}
