import type { LabsChannel, LabsChannelLimits, LabsPlan } from "@vase/contracts";
import type { LabsRuntimeStatus } from "./billing";
import { labsEntitlementsService } from "./labs-entitlements-service";

type AppProjectedLabsContext = {
  globalTenantId: string;
  entitlement: {
    plan: LabsPlan;
    status: LabsRuntimeStatus;
    enabledChannels: LabsChannel[];
    channelLimits?: LabsChannelLimits;
  };
};

type LabsEntitlementSyncDeps = {
  context: AppProjectedLabsContext;
  entitlements?: {
    upsertEntitlement(input: {
      globalTenantId: string;
      plan: LabsPlan;
      status: LabsRuntimeStatus;
      enabledChannels: LabsChannel[];
      channelLimits?: LabsChannelLimits;
    }): Promise<unknown>;
  };
};

export async function syncLabsEntitlementFromContext(input: LabsEntitlementSyncDeps) {
  const entitlements = input.entitlements ?? labsEntitlementsService;
  await entitlements.upsertEntitlement({
    globalTenantId: input.context.globalTenantId,
    plan: input.context.entitlement.plan,
    status: input.context.entitlement.status,
    enabledChannels: input.context.entitlement.enabledChannels,
    channelLimits: input.context.entitlement.channelLimits,
  });
}
