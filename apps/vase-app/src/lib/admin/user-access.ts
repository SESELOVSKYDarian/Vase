import { platformModules } from "@/config/modules";
import type { AppRole, PlatformRole } from "@/lib/auth/roles";
import { getLabsPlanLimits } from "@/lib/labs/plans";

export const userAccessModuleIds = {
  business: "vase_business",
  labs: "vase_labs",
  management: "vase_management",
  rest: "vase_rest",
} as const;

export function getManagedUserAccessModuleIds() {
  return Object.values(userAccessModuleIds);
}

type AdminModuleProduct = "BUSINESS" | "LABS" | "MANAGEMENT" | "REST";

export function getAdminModuleAccessPresentation(
  product: AdminModuleProduct,
  submoduleCount: number,
  moduleSelected: boolean,
  selectedSubmoduleCount: number,
) {
  if (product === "REST") {
    return {
      productLabel: "Rest",
      description: "Al activarlo, la cuenta obtiene acceso a Vase Rest.",
      selectionLabel: moduleSelected ? "Acceso habilitado" : "Inactivo",
      emptySubmodulesLabel: "Vase Rest no requiere submódulos: el acceso se aplica a toda la cuenta.",
      limitKind: null,
    } as const;
  }
  if (product === "MANAGEMENT") {
    return {
      productLabel: "Management",
      description: "Al activarlo, la cuenta obtiene acceso a Vase Management.",
      selectionLabel: moduleSelected ? "Acceso habilitado" : "Inactivo",
      emptySubmodulesLabel: "Este módulo no requiere submódulos.",
      limitKind: null,
    } as const;
  }
  const isBusiness = product === "BUSINESS";
  return {
    productLabel: isBusiness ? "Business" : "Labs",
    description: submoduleCount > 0
      ? `${submoduleCount} submódulos disponibles`
      : "Este módulo no tiene submódulos cargados.",
    selectionLabel: moduleSelected ? `${selectedSubmoduleCount} elegidos` : "Inactivo",
    emptySubmodulesLabel: "No hay submódulos para seleccionar.",
    limitKind: isBusiness ? "pages" as const : "chatbots" as const,
  };
}

type TenantModuleAccess = {
  moduleId: string;
  isActive: boolean;
};

const moduleLabels: Map<string, string> = new Map(
  platformModules.map((module) => [module.id, `Vase ${module.product === "REST" ? "Rest" : module.product.charAt(0) + module.product.slice(1).toLowerCase()}`]),
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

type LabsPlanSubmoduleAccess = {
  moduleId: string;
  key: string | null;
  isActive?: boolean;
};

export type LabsEntitlementPlanFromAccess = "STARTER" | "GROWTH" | "PRO";

const labsSubmodulePlanPriority: Record<string, LabsEntitlementPlanFromAccess> = {
  starter: "STARTER",
  growth: "GROWTH",
  pro: "PRO",
};

const labsPlanRank: Record<LabsEntitlementPlanFromAccess, number> = {
  STARTER: 1,
  GROWTH: 2,
  PRO: 3,
};

export function resolveLabsEntitlementPlanFromSubmoduleAccess(
  submodules: LabsPlanSubmoduleAccess[],
  fallbackPlan: LabsEntitlementPlanFromAccess,
): LabsEntitlementPlanFromAccess {
  return submodules
    .filter((submodule) => submodule.moduleId === userAccessModuleIds.labs && submodule.isActive !== false)
    .map((submodule) => labsSubmodulePlanPriority[submodule.key ?? ""])
    .filter((plan): plan is LabsEntitlementPlanFromAccess => Boolean(plan))
    .sort((left, right) => labsPlanRank[right] - labsPlanRank[left])[0] ?? fallbackPlan;
}

export function resolveAiWorkspacePlanFromLabsSubmoduleAccess(
  submodules: LabsPlanSubmoduleAccess[],
  fallbackPlan: "START" | "PREMIUM",
) {
  const fallbackEntitlementPlan = fallbackPlan === "PREMIUM" ? "PRO" : "STARTER";
  const entitlementPlan = resolveLabsEntitlementPlanFromSubmoduleAccess(submodules, fallbackEntitlementPlan);
  return entitlementPlan === "STARTER" ? "START" : "PREMIUM";
}

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
  labsSubmodules?: LabsPlanSubmoduleAccess[];
  tenantName: string;
  userEmail: string;
};

export function buildLabsWorkspaceProvisioning(input: LabsWorkspaceProvisioningInput) {
  if (!input.moduleIds.includes(userAccessModuleIds.labs)) {
    return null;
  }

  const plan = resolveAiWorkspacePlanFromLabsSubmoduleAccess(
    input.labsSubmodules ?? [],
    input.tenantPlan === "PRO" ? "PREMIUM" : "START",
  );
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
