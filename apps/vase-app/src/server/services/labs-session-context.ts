import { labsSessionContextSchema, type LabsChannelLimits, type LabsPlan } from "@vase/contracts";
import { resolveLabsWorkspaceEntitlement } from "@/server/services/labs-entitlement-state";

export const resolveLabsSessionWorkspaceEntitlement = resolveLabsWorkspaceEntitlement;

export interface LabsSessionContextRepository {
  findActiveMembership(userId: string, requestedTenantSlug?: string): Promise<{
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    role: "OWNER" | "MANAGER" | "MEMBER";
  } | null>;
  findLabsEntitlement(tenantId: string): Promise<{
    plan: LabsPlan;
    status: "ACTIVE" | "TRIAL" | "PAUSED" | "SUSPENDED" | "EXPIRED" | "CANCELLED";
    enabledChannels: Array<"WHATSAPP" | "INSTAGRAM" | "FACEBOOK">;
    channelLimits?: LabsChannelLimits;
  }>;
}

export function createLabsSessionContextService(repository: LabsSessionContextRepository) {
  return {
    async resolve(input: { globalUserId: string; requestedTenantSlug?: string }) {
      const membership = await repository.findActiveMembership(input.globalUserId, input.requestedTenantSlug);
      if (!membership) throw new Error("LABS_TENANT_FORBIDDEN");
      const entitlement = await repository.findLabsEntitlement(membership.tenantId);
      return labsSessionContextSchema.parse({
        globalUserId: input.globalUserId,
        globalTenantId: membership.tenantId,
        tenantSlug: membership.tenantSlug,
        tenantName: membership.tenantName,
        role: membership.role,
        entitlement,
      });
    },
  };
}
