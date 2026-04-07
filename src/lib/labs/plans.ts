import type { AiWorkspacePlan } from "@prisma/client";

export const DEFAULT_LABS_PLAN: AiWorkspacePlan = "START";

export function getLabsPlanLimits(plan: AiWorkspacePlan) {
  if (plan === "PREMIUM") {
    return {
      maxKnowledgeItems: 120,
      maxFiles: 40,
      maxUrls: 30,
      maxChannels: 3,
      monthlyConversationLimit: 5000,
      canUseInstagram: true,
      canUsePremiumTone: true,
      canUseScraping: true,
    };
  }

  return {
    maxKnowledgeItems: 25,
    maxFiles: 8,
    maxUrls: 5,
    maxChannels: 1,
    monthlyConversationLimit: 300,
    canUseInstagram: false,
    canUsePremiumTone: false,
    canUseScraping: true,
  };
}

export function getLabsPlanLabel(plan: AiWorkspacePlan) {
  return plan === "PREMIUM" ? "Labs Premium" : "Labs Start";
}
