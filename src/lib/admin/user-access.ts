import { platformModules } from "@/config/modules";
import type { AppRole, PlatformRole } from "@/lib/auth/roles";
import { getLabsPlanLimits } from "@/lib/labs/plans";

export const userAccessModuleIds = {
  business: "vase_business",
  labs: "vase_labs",
} as const;

type TenantModuleAccess = {
  moduleId: string;
  isActive: boolean;
};

const moduleLabels: Map<string, string> = new Map(
  platformModules.map((module) => [
    module.id,
    module.key === "business" ? "Vase Business" : "Vase Labs",
  ]),
);

export function getUserAccessModuleLabel(moduleId: string) {
  return moduleLabels.get(moduleId) ?? moduleId;
}

export function buildTenantModuleAccessSummary(modules: TenantModuleAccess[]) {
  const activeLabels = modules
    .filter((module) => module.isActive)
    .map((module) => getUserAccessModuleLabel(module.moduleId));

  return activeLabels.length > 0 ? activeLabels.join(", ") : "Sin modulos";
}

type ClientTenantProvisioningInput = {
  moduleIds: string[];
  tenantPlan: "TRIAL" | "PRO";
  proSubmoduleIds?: string[];
};

export function buildClientTenantAccessProvisioning(input: ClientTenantProvisioningInput) {
  const activeModuleIds = Array.from(new Set(input.moduleIds));
  const hasBusiness = activeModuleIds.includes(userAccessModuleIds.business);
  const hasLabs = activeModuleIds.includes(userAccessModuleIds.labs);
  const onboardingProduct = hasBusiness && hasLabs ? "BOTH" : hasLabs ? "LABS" : "BUSINESS";
  const isPro = input.tenantPlan === "PRO";
  const activeSubmoduleIds = isPro
    ? Array.from(new Set((input.proSubmoduleIds ?? []).filter(Boolean)))
    : [];

  return {
    onboardingProduct,
    tenantStatus: isPro ? "ACTIVE" : "TRIAL",
    subscriptionPlan: isPro ? "PREMIUM" : "START",
    billingStatus: isPro ? "ACTIVE" : "TRIAL",
    activeModuleIds,
    activeSubmoduleIds,
  } as const;
}

type LabsWorkspaceProvisioningInput = {
  moduleIds: string[];
  tenantPlan: "TRIAL" | "PRO";
  tenantName: string;
  userEmail: string;
};

export function buildLabsWorkspaceProvisioning(input: LabsWorkspaceProvisioningInput) {
  if (!input.moduleIds.includes(userAccessModuleIds.labs)) {
    return null;
  }

  const plan = input.tenantPlan === "PRO" ? "PREMIUM" : "START";
  const limits = getLabsPlanLimits(plan);
  const tenantName = input.tenantName.trim() || "Vase";

  return {
    plan,
    assistantDisplayName: `${tenantName} AI`,
    tone: "PROFESSIONAL",
    trainingStatus: "DRAFT",
    timezone: "America/Argentina/Buenos_Aires",
    businessHours: {
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      hoursStart: "09:00",
      hoursEnd: "18:00",
    },
    humanEscalationEnabled: false,
    escalationDestination: "EMAIL",
    escalationContact: input.userEmail.trim(),
    scrapingEnabled: true,
    monthlyConversationLimit: limits.monthlyConversationLimit,
    monthlyKnowledgeItemLimit: limits.maxKnowledgeItems,
    maxChannels: limits.maxChannels,
    maxFiles: limits.maxFiles,
    maxUrls: limits.maxUrls,
  } as const;
}

export function buildAdminCreatedUserVerification(now = new Date()) {
  return {
    emailVerified: now,
  };
}

export function shouldForceAdminCreatedUserPasswordReset(input: {
  temporaryPassword: boolean;
  rawPassword: string;
}) {
  return input.temporaryPassword && input.rawPassword.trim().length > 0;
}

export type MasterUserUiRole =
  | "cliente"
  | "admin"
  | "developer"
  | "designer"
  | "tester"
  | "soporte";

type RoleMapping = {
  platformRole: PlatformRole;
  appRole: AppRole;
};

const roleMapping: Record<MasterUserUiRole, RoleMapping> = {
  admin: { platformRole: "SUPER_ADMIN", appRole: "ADMIN" },
  soporte: { platformRole: "SUPPORT", appRole: "SOPORTE" },
  developer: { platformRole: "DEVELOPER", appRole: "DEVELOPER" },
  designer: { platformRole: "USER", appRole: "DESIGNER" },
  tester: { platformRole: "USER", appRole: "TESTER" },
  cliente: { platformRole: "USER", appRole: "CLIENTE" },
};

export function getRoleMappingFromUiRole(uiRole: MasterUserUiRole): RoleMapping {
  return roleMapping[uiRole];
}

export function inferUiRoleFromStoredRoles(input: {
  platformRole: PlatformRole;
  appRoles: AppRole[];
}): MasterUserUiRole {
  if (input.appRoles.includes("ADMIN") || input.platformRole === "SUPER_ADMIN") return "admin";
  if (input.appRoles.includes("SOPORTE") || input.platformRole === "SUPPORT") return "soporte";
  if (input.appRoles.includes("DEVELOPER") || input.platformRole === "DEVELOPER") return "developer";
  if (input.appRoles.includes("DESIGNER")) return "designer";
  if (input.appRoles.includes("TESTER")) return "tester";
  return "cliente";
}
