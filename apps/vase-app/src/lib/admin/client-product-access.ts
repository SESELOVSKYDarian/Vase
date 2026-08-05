import type { AiWorkspacePlan } from "@prisma/client";
import { getLabsPlanLimits } from "@vase/contracts";
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

export const clientProductAccessEnvelopeSchema = z.object({
  version: z.literal(2),
  productAccess: clientProductAccessSchema,
}).strict();

export function parseStoredClientProductAccess(value: unknown): ClientProductAccess | null {
  const parsed = clientProductAccessEnvelopeSchema.safeParse(value);
  return parsed.success ? parsed.data.productAccess : null;
}

export function projectClientProductAccessToLegacy(access: ClientProductAccess) {
  const statuses = [
    ...(access.business?.submodules.map((submodule) => submodule.status) ?? []),
    access.labs?.status,
    access.rest?.status,
    access.management?.status,
  ].filter((status): status is CommercialStatus => status === "TRIAL" || status === "ACTIVE");

  return {
    tenantPlan: statuses.includes("ACTIVE") ? "PRO" as const : "TRIAL" as const,
    proSubmoduleIds: [
      ...(access.business?.submodules.map((submodule) => submodule.id) ?? []),
      ...(access.labs ? [access.labs.submoduleId] : []),
    ],
    moduleLimits: {} as Record<string, { pages: number | null; chatbots: number | null }>,
  };
}

type LabsEntitlement = {
  maxKnowledgeItems: number;
  maxFiles: number;
  maxUrls: number;
  monthlyConversationLimit: number;
  maxChannels: number;
  legacyPlan: AiWorkspacePlan;
};

const labsEntitlements: Record<LabsEntitlementPlan, LabsEntitlement> = {
  STARTER: {
    maxKnowledgeItems: 25,
    maxFiles: 8,
    maxUrls: 5,
    monthlyConversationLimit: 300,
    maxChannels: 1,
    legacyPlan: "START",
  },
  PRO: {
    maxKnowledgeItems: 80,
    maxFiles: 25,
    maxUrls: 20,
    monthlyConversationLimit: 2500,
    maxChannels: 2,
    legacyPlan: "PREMIUM",
  },
  GROWTH: {
    maxKnowledgeItems: 120,
    maxFiles: 40,
    maxUrls: 30,
    monthlyConversationLimit: 5000,
    maxChannels: 3,
    legacyPlan: "PREMIUM",
  },
};

export function getLabsEntitlement(plan: LabsEntitlementPlan) {
  const entitlement = labsEntitlements[plan];
  const channels = getLabsPlanLimits(plan).channelLimits;
  return {
    ...entitlement,
    channels: {
      whatsapp: channels.WHATSAPP,
      instagram: channels.INSTAGRAM,
      messenger: channels.FACEBOOK,
    },
  };
}

export function buildLabsWorkspaceEntitlementData(plan: LabsEntitlementPlan) {
  const entitlement = getLabsEntitlement(plan);
  const canonicalChannels = getLabsPlanLimits(plan).channelLimits;
  return {
    entitlementPlan: plan,
    plan: entitlement.legacyPlan,
    monthlyConversationLimit: entitlement.monthlyConversationLimit,
    monthlyKnowledgeItemLimit: entitlement.maxKnowledgeItems,
    maxChannels: entitlement.maxChannels,
    channelLimits: canonicalChannels,
    maxFiles: entitlement.maxFiles,
    maxUrls: entitlement.maxUrls,
  } as const;
}

function summarizeClientProductAccess(access: ClientProductAccess | null) {
  return {
    business: access?.business?.submodules.map((submodule) => ({
      submoduleId: submodule.id,
      key: submodule.key,
      status: submodule.status,
      features: submodule.features.map((feature) => ({
        featureId: feature.featureId,
        enabled: feature.enabled,
        hasValue: feature.value !== null,
      })),
    })) ?? null,
    labs: access?.labs ? { plan: access.labs.plan, status: access.labs.status } : null,
    rest: access?.rest
      ? { pricingVersionId: access.rest.pricingVersionId, status: access.rest.status }
      : null,
    management: access?.management ? { status: access.management.status } : null,
  };
}

type AuditFeature = {
  submoduleId: string;
  featureId: string;
  enabled: boolean;
  value: boolean | number | string | null;
};

type AuditFeatureChange = {
  submoduleId: string;
  featureId: string;
  change: "ADDED" | "REMOVED" | "ENABLED" | "DISABLED" | "VALUE_CHANGED" | "STATE_AND_VALUE_CHANGED";
  beforeEnabled: boolean | null;
  afterEnabled: boolean | null;
  valueChanged: boolean;
};

function auditFeatures(access: ClientProductAccess | null) {
  return access?.business?.submodules.flatMap((submodule) =>
    submodule.features.map((feature): AuditFeature => ({
      submoduleId: submodule.id,
      featureId: feature.featureId,
      enabled: feature.enabled,
      value: feature.value,
    }))) ?? [];
}

export function buildClientProductAccessAuditChange(
  before: ClientProductAccess | null,
  after: ClientProductAccess | null,
) {
  const beforeFeatures = new Map(auditFeatures(before).map((feature) => [
    `${feature.submoduleId}:${feature.featureId}`,
    feature,
  ]));
  const afterFeatures = new Map(auditFeatures(after).map((feature) => [
    `${feature.submoduleId}:${feature.featureId}`,
    feature,
  ]));
  const keys = Array.from(new Set([...beforeFeatures.keys(), ...afterFeatures.keys()])).sort();
  const featureChanges: AuditFeatureChange[] = [];
  for (const key of keys) {
    const previous = beforeFeatures.get(key);
    const next = afterFeatures.get(key);
    if (!previous && next) {
      featureChanges.push({
        submoduleId: next.submoduleId,
        featureId: next.featureId,
        change: "ADDED",
        beforeEnabled: null,
        afterEnabled: next.enabled,
        valueChanged: next.value !== null,
      });
      continue;
    }
    if (previous && !next) {
      featureChanges.push({
        submoduleId: previous.submoduleId,
        featureId: previous.featureId,
        change: "REMOVED",
        beforeEnabled: previous.enabled,
        afterEnabled: null,
        valueChanged: previous.value !== null,
      });
      continue;
    }
    if (!previous || !next) continue;
    const enabledChanged = previous.enabled !== next.enabled;
    const valueChanged = !Object.is(previous.value, next.value);
    if (!enabledChanged && !valueChanged) continue;
    const change = enabledChanged && valueChanged
      ? "STATE_AND_VALUE_CHANGED" as const
      : enabledChanged
        ? next.enabled ? "ENABLED" as const : "DISABLED" as const
        : "VALUE_CHANGED" as const;
    featureChanges.push({
      submoduleId: next.submoduleId,
      featureId: next.featureId,
      change,
      beforeEnabled: previous.enabled,
      afterEnabled: next.enabled,
      valueChanged,
    });
  }

  return {
    before: summarizeClientProductAccess(before),
    after: summarizeClientProductAccess(after),
    featureChanges,
  };
}
