import type { AiWorkspacePlan } from "@prisma/client";
import { z } from "zod";

export type CommercialStatus = "TRIAL" | "ACTIVE";
export type LabsEntitlementPlan = "STARTER" | "PRO" | "GROWTH";

const commercialStatusSchema = z.enum(["TRIAL", "ACTIVE"]);

const businessSubmoduleSchema = z.object({
  id: z.string().min(1),
  key: z.enum(["plantilla", "personalizado"]),
  status: commercialStatusSchema,
  features: z.array(z.object({
    featureId: z.string().min(1),
    enabled: z.boolean(),
    value: z.union([z.boolean(), z.number().int(), z.string()]).nullable(),
  }).strict()),
}).strict();

export const clientProductAccessSchema = z.object({
  business: z.object({
    submodules: z.array(businessSubmoduleSchema).max(2),
  }).strict().nullable(),
  labs: z.object({
    submoduleId: z.string().min(1),
    plan: z.enum(["STARTER", "PRO", "GROWTH"]),
    status: commercialStatusSchema,
  }).strict().nullable(),
  rest: z.object({
    pricingVersionId: z.string().min(1),
    status: commercialStatusSchema,
  }).strict().nullable(),
  management: z.object({
    status: commercialStatusSchema,
  }).strict().nullable(),
}).strict().superRefine((access, context) => {
  if (!access.business) return;

  const ids = new Set<string>();
  const keys = new Set<string>();

  access.business.submodules.forEach((submodule, index) => {
    if (ids.has(submodule.id)) {
      context.addIssue({
        code: "custom",
        message: "Business submodule ids must be unique.",
        path: ["business", "submodules", index, "id"],
      });
    }
    ids.add(submodule.id);

    if (keys.has(submodule.key)) {
      context.addIssue({
        code: "custom",
        message: "Business submodule keys must be unique.",
        path: ["business", "submodules", index, "key"],
      });
    }
    keys.add(submodule.key);
  });
});

export type ClientProductAccess = z.infer<typeof clientProductAccessSchema>;

type LabsEntitlement = {
  channels: {
    whatsapp: number;
    instagram: number;
    messenger: number;
  };
  maxKnowledgeItems: number;
  maxFiles: number;
  maxUrls: number;
  monthlyConversationLimit: number;
  maxChannels: number;
  legacyPlan: AiWorkspacePlan;
};

const labsEntitlements: Record<LabsEntitlementPlan, LabsEntitlement> = {
  STARTER: {
    channels: { whatsapp: 1, instagram: 0, messenger: 0 },
    maxKnowledgeItems: 25,
    maxFiles: 8,
    maxUrls: 5,
    monthlyConversationLimit: 300,
    maxChannels: 1,
    legacyPlan: "START",
  },
  PRO: {
    channels: { whatsapp: 1, instagram: 1, messenger: 0 },
    maxKnowledgeItems: 80,
    maxFiles: 25,
    maxUrls: 20,
    monthlyConversationLimit: 2500,
    maxChannels: 2,
    legacyPlan: "PREMIUM",
  },
  GROWTH: {
    channels: { whatsapp: 1, instagram: 1, messenger: 1 },
    maxKnowledgeItems: 120,
    maxFiles: 40,
    maxUrls: 30,
    monthlyConversationLimit: 5000,
    maxChannels: 3,
    legacyPlan: "PREMIUM",
  },
};

export function getLabsEntitlement(plan: LabsEntitlementPlan) {
  return labsEntitlements[plan];
}
