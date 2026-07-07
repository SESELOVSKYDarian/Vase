import type { LabsChannel, LabsPlan, LabsServiceStatus } from "@vase/contracts";

export type LabsSessionMembership = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  role: string;
};

export type LabsSessionEntitlement = {
  plan: LabsPlan;
  status: LabsServiceStatus;
  enabledChannels: LabsChannel[];
};

export interface LabsSessionContextRepository {
  findActiveMembership(
    globalUserId: string,
    requestedTenantSlug?: string,
  ): Promise<LabsSessionMembership | null>;
  findLabsEntitlement(globalTenantId: string): Promise<LabsSessionEntitlement>;
}

export function createLabsSessionContextService(repository: LabsSessionContextRepository) {
  return {
    async resolve(input: { globalUserId: string; requestedTenantSlug?: string }) {
      const membership = await repository.findActiveMembership(
        input.globalUserId,
        input.requestedTenantSlug,
      );

      if (!membership) {
        throw new Error("LABS_TENANT_FORBIDDEN");
      }

      const entitlement = await repository.findLabsEntitlement(membership.tenantId);

      return {
        globalUserId: input.globalUserId,
        globalTenantId: membership.tenantId,
        tenantSlug: membership.tenantSlug,
        tenantName: membership.tenantName,
        role: membership.role,
        entitlement,
      };
    },
  };
}
