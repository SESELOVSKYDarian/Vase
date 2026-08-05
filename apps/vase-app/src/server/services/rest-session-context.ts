import { createHmac, timingSafeEqual } from "node:crypto";
import {
  restSessionContextSchema,
  type RestPlan,
  type RestPlanLimits,
  type RestServiceStatus,
  type RestSessionContext,
} from "@vase/contracts";
import type { PrismaClient } from "@prisma/client";
import { isRestContractEntitled } from "@/lib/rest/contract-entitlement";
import { buildCompatibleUserModuleAccessWhere } from "@/server/services/user-module-access-policy";

type RestMembershipProjection = {
  globalUserId: string;
  userName: string;
  membershipStatus: string;
  tenantRole: string;
  globalTenantId: string;
  tenantSlug: string;
  tenantName: string;
  tenantStatus: string;
  tenantModuleEntitled: boolean;
  userModuleAccessActive: boolean;
  contract: {
    status: RestServiceStatus;
    plan: RestPlan;
    pricingVersion: number;
    limits: RestPlanLimits;
  } | null;
};

export interface RestSessionContextRepository {
  findMembership(input: {
    globalUserId: string;
    requestedTenantSlug?: string;
  }): Promise<RestMembershipProjection | null>;
}

export function createRestSessionContextService(repository: RestSessionContextRepository) {
  return {
    async resolve(input: { globalUserId: string; requestedTenantSlug?: string }): Promise<RestSessionContext> {
      const membership = await repository.findMembership(input);
      if (
        !membership ||
        membership.membershipStatus !== "ACTIVE" ||
        !membership.tenantModuleEntitled ||
        !membership.userModuleAccessActive ||
        !["ACTIVE", "TRIAL"].includes(membership.tenantStatus)
      ) {
        throw new Error("REST_TENANT_FORBIDDEN");
      }
      if (!membership.contract || !isRestContractEntitled(membership.contract.status)) {
        throw new Error("REST_CONTRACT_INACTIVE");
      }

      return restSessionContextSchema.parse({
        globalTenantId: membership.globalTenantId,
        tenantSlug: membership.tenantSlug,
        tenantName: membership.tenantName,
        actor: {
          kind: "GLOBAL_USER",
          id: membership.globalUserId,
          displayName: membership.userName,
        },
        branchId: null,
        branchRoles: [],
        deviceId: null,
        entitlement: {
          globalTenantId: membership.globalTenantId,
          plan: membership.contract.plan,
          status: membership.contract.status,
          limits: membership.contract.limits,
          contractVersion: membership.contract.pricingVersion,
        },
      });
    },
  };
}

export function findAuthorizedRestMembership(
  db: Pick<PrismaClient, "membership">,
  input: { globalUserId: string; requestedTenantSlug?: string },
) {
  return db.membership.findFirst({
    where: {
      userId: input.globalUserId,
      status: "ACTIVE",
      user: buildCompatibleUserModuleAccessWhere("vase_rest"),
      tenant: {
        ...(input.requestedTenantSlug ? { slug: input.requestedTenantSlug } : {}),
        status: { in: ["ACTIVE", "TRIAL"] },
        tenantModules: {
          some: {
            moduleId: "vase_rest",
            isActive: true,
            commercialStatus: { in: ["ACTIVE", "TRIAL"] },
          },
        },
      },
    },
    include: {
      user: { select: { id: true, name: true } },
      tenant: {
        include: {
          restContract: { include: { pricingVersion: true } },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export function signRestSessionContext(payload: string, secret: string) {
  if (secret.length < 24) throw new Error("REST_CONTEXT_SIGNING_SECRET_NOT_CONFIGURED");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function verifyRestSessionContextSignature(payload: string, signature: string, secret: string) {
  try {
    const expected = Buffer.from(signRestSessionContext(payload, secret));
    const candidate = Buffer.from(signature);
    return expected.length === candidate.length && timingSafeEqual(expected, candidate);
  } catch {
    return false;
  }
}
