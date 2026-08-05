import { labsSessionContextSchema, type LabsChannelLimits, type LabsPlan } from "@vase/contracts";
import type { PrismaClient } from "@prisma/client";
import {
  resolveLabsCommercialStatus,
  resolveLabsWorkspaceEntitlement,
  resolveStoredLabsEntitlementPlan,
} from "@/server/services/labs-entitlement-state";
import { buildCompatibleUserModuleAccessWhere } from "@/server/services/user-module-access-policy";

export const resolveLabsSessionWorkspaceEntitlement = resolveLabsWorkspaceEntitlement;

export async function findAuthorizedLabsMembership(
  db: Pick<PrismaClient, "membership">,
  input: { userId: string; requestedTenantSlug?: string },
) {
  const membership = await db.membership.findFirst({
    where: {
      userId: input.userId,
      status: "ACTIVE",
      user: buildCompatibleUserModuleAccessWhere("vase_labs"),
      tenant: {
        ...(input.requestedTenantSlug ? { slug: input.requestedTenantSlug } : {}),
        status: { in: ["ACTIVE", "TRIAL"] },
        tenantModules: {
          some: {
            moduleId: "vase_labs",
            isActive: true,
            commercialStatus: { in: ["ACTIVE", "TRIAL"] },
          },
        },
      },
    },
    include: {
      tenant: {
        include: {
          aiWorkspace: true,
          tenantModules: {
            where: { moduleId: "vase_labs" },
            select: { isActive: true, commercialStatus: true },
          },
          tenantSubmodules: {
            where: { isActive: true, submodule: { moduleId: "vase_labs" } },
            select: {
              isActive: true,
              commercialStatus: true,
              submodule: { select: { moduleId: true, key: true } },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (!membership) return null;

  const paidPlan = resolveStoredLabsEntitlementPlan({
    entitlementPlan: membership.tenant.aiWorkspace?.entitlementPlan,
    legacyPlan: membership.tenant.aiWorkspace?.plan,
  });
  const selectedSubmodule = membership.tenant.tenantSubmodules.find(
    (item) => item.submodule.key?.toUpperCase() === paidPlan,
  );
  return resolveLabsCommercialStatus({
    module: membership.tenant.tenantModules[0],
    submodule: selectedSubmodule,
  }) === "SUSPENDED"
    ? null
    : membership;
}

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
