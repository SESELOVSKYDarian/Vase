import { forbidden } from "next/navigation";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { getLabsOwnerDashboard } from "@/server/queries/labs";
import { getTenantSupportOverview } from "@/server/queries/support";

type OwnerMembership = Awaited<ReturnType<typeof requireTenantRole>>["membership"];
type LabsDashboard = NonNullable<Awaited<ReturnType<typeof getLabsOwnerDashboard>>>;
type SupportOverview = Awaited<ReturnType<typeof getTenantSupportOverview>>;

function assertLabsEnabled(membership: OwnerMembership) {
  return membership.tenant.onboardingProduct === "LABS" || membership.tenant.onboardingProduct === "BOTH";
}

export async function getLabsOwnerPageData() {
  let membership: OwnerMembership;

  try {
    ({ membership } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const dashboard = await getLabsOwnerDashboard(membership.tenantId);

  if (!dashboard) {
    forbidden();
  }

  return {
    membership,
    dashboard: dashboard as LabsDashboard,
    labsEnabled: assertLabsEnabled(membership),
  };
}

export async function getLabsOwnerActivityData() {
  let membership: OwnerMembership;

  try {
    ({ membership } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const [dashboard, supportOverview] = await Promise.all([
    getLabsOwnerDashboard(membership.tenantId),
    getTenantSupportOverview(membership.tenantId),
  ]);

  if (!dashboard) {
    forbidden();
  }

  return {
    membership,
    dashboard: dashboard as LabsDashboard,
    supportOverview: supportOverview as SupportOverview,
    labsEnabled: assertLabsEnabled(membership),
  };
}

export function readBusinessHours(input: unknown) {
  if (!input || typeof input !== "object") {
    return {
      hoursStart: "09:00",
      hoursEnd: "18:00",
    };
  }

  const candidate = input as {
    hoursStart?: string;
    hoursEnd?: string;
  };

  return {
    hoursStart: candidate.hoursStart ?? "09:00",
    hoursEnd: candidate.hoursEnd ?? "18:00",
  };
}

export function trainingTone(status: string) {
  switch (status) {
    case "READY":
      return "success";
    case "FAILED":
      return "danger";
    case "PROCESSING":
    case "QUEUED":
      return "warning";
    default:
      return "neutral";
  }
}

export function channelTone(status: string) {
  switch (status) {
    case "CONNECTED":
      return "success";
    case "ERROR":
      return "danger";
    case "PENDING":
      return "warning";
    default:
      return "neutral";
  }
}

export function conversationTone(status: string) {
  switch (status) {
    case "ESCALATED":
      return "warning";
    case "CLOSED":
      return "neutral";
    default:
      return "info";
  }
}

export function formatDate(value: Date | null) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
