import { forbidden } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { WorkBoard, type WorkItem } from "@/components/panel/work-board";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import { formatMoneyFromCents } from "@/lib/business/custom-quotes";
import { BUSINESS_WORKSPACE_PATH } from "@/lib/business/links";
import { describeWorkProgress } from "@/lib/business/work-board";
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

  const [workspace, dashboard] = await Promise.all([
    getTenantCustomizationQuoteWorkspace(membership.tenantId),
    getUnifiedTenantDashboard(membership.tenantId, session.user.id, session.user.platformRole),
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
      <WorkBoard items={items} nowMs={nowMs} newRequestHref={isOwner ? BUSINESS_WORKSPACE_PATH : null} />
    </AppShell>
  );
}
