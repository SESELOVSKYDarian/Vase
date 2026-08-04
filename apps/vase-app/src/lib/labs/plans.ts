import type { AiWorkspacePlan } from "@prisma/client";
import {
  getLabsEntitlement,
  type LabsEntitlementPlan,
} from "@/lib/admin/client-product-access";

export const DEFAULT_LABS_PLAN: AiWorkspacePlan = "START";

function toLabsPlanLimits(plan: LabsEntitlementPlan) {
  const entitlement = getLabsEntitlement(plan);
  return {
    maxKnowledgeItems: entitlement.maxKnowledgeItems,
    maxFiles: entitlement.maxFiles,
    maxUrls: entitlement.maxUrls,
    maxChannels: entitlement.maxChannels,
    monthlyConversationLimit: entitlement.monthlyConversationLimit,
    canUseInstagram: entitlement.channels.instagram > 0,
    canUsePremiumTone: entitlement.legacyPlan === "PREMIUM",
    canUseScraping: true,
  };
}

/**
 * @deprecated Prefer getLabsEntitlement for product-aware Labs provisioning.
 * Legacy PREMIUM intentionally keeps its historical Growth-level limits until
 * runtime provisioning migrates to LabsEntitlementPlan.
 */
export function getLabsPlanLimits(plan: AiWorkspacePlan): ReturnType<typeof toLabsPlanLimits>;
export function getLabsPlanLimits(plan: LabsEntitlementPlan): ReturnType<typeof toLabsPlanLimits>;
export function getLabsPlanLimits(plan: AiWorkspacePlan | LabsEntitlementPlan) {
  if (plan === "START") return toLabsPlanLimits("STARTER");
  if (plan === "PREMIUM") return toLabsPlanLimits("GROWTH");
  return toLabsPlanLimits(plan);
}

export function getLabsPlanLabel(plan: AiWorkspacePlan) {
  return plan === "PREMIUM" ? "Labs Premium" : "Labs Start";
}
