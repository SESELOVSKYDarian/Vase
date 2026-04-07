import type {
  BillingStatus,
  BusinessPlan,
  StorefrontPage,
  TenantSubscription,
} from "@prisma/client";

export type PlanSnapshot = Pick<
  TenantSubscription,
  | "plan"
  | "billingStatus"
  | "premiumEnabled"
  | "customDomainEnabled"
  | "temporaryPagesEnabled"
  | "currentPeriodEndsAt"
>;

export const DEFAULT_BUSINESS_PLAN: PlanSnapshot = {
  plan: "START",
  billingStatus: "TRIAL",
  premiumEnabled: false,
  customDomainEnabled: false,
  temporaryPagesEnabled: true,
  currentPeriodEndsAt: null,
};

export function getEffectivePlan(plan?: Partial<PlanSnapshot> | null): PlanSnapshot {
  return {
    ...DEFAULT_BUSINESS_PLAN,
    ...plan,
  };
}

export function getPlanLimits(plan: PlanSnapshot) {
  if (plan.plan === "PREMIUM" || plan.premiumEnabled) {
    return {
      maxPages: 12,
      canUseCustomDomain: true,
      canRequestCustomTemplate: true,
      canKeepTemporaryPages: true,
    };
  }

  return {
    maxPages: 3,
    canUseCustomDomain: false,
    canRequestCustomTemplate: true,
    canKeepTemporaryPages: true,
  };
}

export function getPlanLabel(plan: BusinessPlan) {
  return plan === "PREMIUM" ? "Premium" : "Start";
}

export function getBillingLabel(status: BillingStatus) {
  switch (status) {
    case "ACTIVE":
      return "Activo";
    case "PAST_DUE":
      return "Pendiente de pago";
    case "CANCELED":
      return "Cancelado";
    default:
      return "Trial";
  }
}

export function canCreateStorefrontPage(
  pages: Array<Pick<StorefrontPage, "status">>,
  plan: PlanSnapshot,
) {
  const limits = getPlanLimits(plan);
  const activePages = pages.filter((page) => page.status !== "ARCHIVED").length;

  return activePages < limits.maxPages;
}
