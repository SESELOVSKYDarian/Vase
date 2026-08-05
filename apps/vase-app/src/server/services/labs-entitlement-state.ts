import {
  getEffectiveLabsEntitlement,
  labsChannelLimitsSchema,
  type LabsChannel,
  type LabsChannelLimits,
  type LabsPlan,
} from "@vase/contracts";

export function resolveStoredLabsEntitlementPlan(input: {
  entitlementPlan: unknown;
  legacyPlan: "START" | "PREMIUM" | null | undefined;
}): LabsPlan {
  if (input.entitlementPlan === "STARTER" || input.entitlementPlan === "PRO" || input.entitlementPlan === "GROWTH") {
    return input.entitlementPlan;
  }
  return input.legacyPlan === "PREMIUM" ? "GROWTH" : "STARTER";
}

type CommercialLink = {
  isActive: boolean;
  commercialStatus: "TRIAL" | "ACTIVE" | string;
} | null | undefined;

export function resolveLabsCommercialStatus(input: {
  module: CommercialLink;
  submodule: CommercialLink;
}): "TRIAL" | "ACTIVE" | "SUSPENDED" {
  if (!input.module?.isActive || !input.submodule?.isActive) return "SUSPENDED";
  const entitledStatuses = new Set(["ACTIVE", "TRIAL"]);
  if (
    !entitledStatuses.has(input.module.commercialStatus) ||
    !entitledStatuses.has(input.submodule.commercialStatus)
  ) return "SUSPENDED";
  return input.module.commercialStatus === "ACTIVE" && input.submodule.commercialStatus === "ACTIVE"
    ? "ACTIVE"
    : "TRIAL";
}

type StoredLabsEntitlementInput = {
  paidPlan: LabsPlan;
  channelLimits: unknown;
  channelOverrideReason: string | null | undefined;
  channelOverrideBy: string | null | undefined;
  channelOverrideAt: Date | string | null | undefined;
};

export function resolveLabsWorkspaceEntitlement(input: StoredLabsEntitlementInput) {
  const planChannelLimits = getEffectiveLabsEntitlement({ paidPlan: input.paidPlan }).channelLimits;
  const parsedLimits = labsChannelLimitsSchema.safeParse(input.channelLimits);
  const hasCompleteOverride = parsedLimits.success && Boolean(
    input.channelOverrideReason && input.channelOverrideBy && input.channelOverrideAt,
  );
  const channelLimits: LabsChannelLimits = hasCompleteOverride ? parsedLimits.data : planChannelLimits;
  const enabledChannels = (labsChannelLimitsSchema.keyof().options as LabsChannel[])
    .filter((channel) => channelLimits[channel] > 0);

  return {
    channelLimits,
    planChannelLimits,
    enabledChannels,
    manualOverride: hasCompleteOverride,
    overrideReason: hasCompleteOverride ? input.channelOverrideReason! : null,
    overrideUpdatedBy: hasCompleteOverride ? input.channelOverrideBy! : null,
    overrideUpdatedAt: hasCompleteOverride
      ? new Date(input.channelOverrideAt!).toISOString()
      : null,
  };
}
