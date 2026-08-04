import {
  getEffectiveLabsEntitlement,
  labsChannelLimitsSchema,
  type LabsChannel,
  type LabsChannelLimits,
  type LabsPlan,
} from "@vase/contracts";

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
  const channelLimits: LabsChannelLimits = parsedLimits.success ? parsedLimits.data : planChannelLimits;
  const hasCompleteOverrideMetadata = Boolean(
    input.channelOverrideReason && input.channelOverrideBy && input.channelOverrideAt,
  );
  const enabledChannels = (labsChannelLimitsSchema.keyof().options as LabsChannel[])
    .filter((channel) => channelLimits[channel] > 0);

  return {
    channelLimits,
    planChannelLimits,
    enabledChannels,
    manualOverride: hasCompleteOverrideMetadata,
    overrideReason: hasCompleteOverrideMetadata ? input.channelOverrideReason! : null,
    overrideUpdatedBy: hasCompleteOverrideMetadata ? input.channelOverrideBy! : null,
    overrideUpdatedAt: hasCompleteOverrideMetadata
      ? new Date(input.channelOverrideAt!).toISOString()
      : null,
  };
}
