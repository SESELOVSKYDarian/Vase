import { forbidden } from "next/navigation";
import { tenantRoles, requireTenantRole } from "@/lib/auth/guards";
import { getLabsOwnerDashboard } from "@/server/queries/labs";
import { getTenantModulesAccess } from "@/server/queries/modules";
import { getTenantSupportOverview } from "@/server/queries/support";

type OwnerContext = Awaited<ReturnType<typeof requireTenantRole>>;
type OwnerMembership = OwnerContext["membership"];
type OwnerSession = OwnerContext["session"];
type LabsDashboard = NonNullable<Awaited<ReturnType<typeof getLabsOwnerDashboard>>>;
type SupportOverview = Awaited<ReturnType<typeof getTenantSupportOverview>>;

async function isLabsEnabledForUser(tenantId: string, userId: string) {
  const modulesPayload = await getTenantModulesAccess(tenantId, userId);
  return modulesPayload?.modules.some((module) => module.key === "labs" && module.isActive) ?? false;
}

export async function getLabsOwnerPageData() {
  let membership: OwnerMembership;
  let session: OwnerSession;

  try {
    ({ membership, session } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const [dashboard, labsEnabled] = await Promise.all([
    getLabsOwnerDashboard(membership.tenantId),
    isLabsEnabledForUser(membership.tenantId, session.user.id),
  ]);

  if (!dashboard || !labsEnabled) {
    forbidden();
  }

  return {
    membership,
    dashboard: dashboard as LabsDashboard,
    labsEnabled,
  };
}

export async function getLabsOwnerActivityData() {
  let membership: OwnerMembership;
  let session: OwnerSession;

  try {
    ({ membership, session } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    forbidden();
  }

  const [dashboard, supportOverview, labsEnabled] = await Promise.all([
    getLabsOwnerDashboard(membership.tenantId),
    getTenantSupportOverview(membership.tenantId),
    isLabsEnabledForUser(membership.tenantId, session.user.id),
  ]);

  if (!dashboard || !labsEnabled) {
    forbidden();
  }

  return {
    membership,
    dashboard: dashboard as LabsDashboard,
    supportOverview: supportOverview as SupportOverview,
    labsEnabled,
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
