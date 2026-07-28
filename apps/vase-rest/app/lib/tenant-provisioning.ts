import type {
  RestEntitlement,
  RestSessionContext,
} from "@vase/contracts";
import { db } from "./db";

export interface RestTenantProvisioningRepository {
  upsertTenantWithEntitlement(input: {
    globalTenantId: string;
    name: string;
    slug: string;
    entitlement: RestEntitlement;
  }): Promise<{ id: string; globalTenantId: string }>;
}

export const prismaRestTenantProvisioningRepository: RestTenantProvisioningRepository = {
  async upsertTenantWithEntitlement(input) {
    return db.$transaction(async (tx) => {
      const tenant = await tx.restTenant.upsert({
        where: { globalTenantId: input.globalTenantId },
        create: {
          globalTenantId: input.globalTenantId,
          name: input.name,
          slug: input.slug,
        },
        update: {
          name: input.name,
          slug: input.slug,
        },
        select: { id: true, globalTenantId: true },
      });
      await tx.restEntitlementProjection.upsert({
        where: { globalTenantId: input.globalTenantId },
        create: {
          restTenantId: tenant.id,
          globalTenantId: input.globalTenantId,
          plan: input.entitlement.plan,
          status: input.entitlement.status,
          contractVersion: input.entitlement.contractVersion,
          branchLimit: input.entitlement.limits.branches,
          localEmployeeLimit: input.entitlement.limits.localEmployees,
          deviceLimit: input.entitlement.limits.devices,
          edgeLimit: input.entitlement.limits.edgeInstallations,
          effectiveAt: new Date(),
        },
        update: {
          restTenantId: tenant.id,
          plan: input.entitlement.plan,
          status: input.entitlement.status,
          contractVersion: input.entitlement.contractVersion,
          branchLimit: input.entitlement.limits.branches,
          localEmployeeLimit: input.entitlement.limits.localEmployees,
          deviceLimit: input.entitlement.limits.devices,
          edgeLimit: input.entitlement.limits.edgeInstallations,
        },
      });
      return tenant;
    });
  },
};

export async function provisionRestTenant(input: {
  context: RestSessionContext;
  repository?: RestTenantProvisioningRepository;
}) {
  if (input.context.globalTenantId !== input.context.entitlement.globalTenantId) {
    throw new Error("REST_TENANT_FORBIDDEN");
  }
  if (!["ACTIVE", "TRIAL"].includes(input.context.entitlement.status)) {
    throw new Error("REST_CONTRACT_INACTIVE");
  }

  return (input.repository ?? prismaRestTenantProvisioningRepository)
    .upsertTenantWithEntitlement({
      globalTenantId: input.context.globalTenantId,
      name: input.context.tenantName,
      slug: input.context.tenantSlug,
      entitlement: input.context.entitlement,
    });
}
