import { restEntitlementSchema, restPlanLimitsSchema, restPlanSchema } from "@vase/contracts";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import {
  createRestEntitlementService,
  type RestEntitlementRepository,
  type RestPricingRecord,
} from "@/server/services/rest-entitlements";
import { ensureModuleCatalogSynced } from "@/server/services/modules";
import { getTenantModulesAccess } from "@/server/queries/modules";

export const restAdminCommandSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("CREATE_DRAFT"),
    plan: restPlanSchema,
    currency: z.string().length(3),
    monthlyPrice: z.number().nonnegative(),
    limits: restPlanLimitsSchema,
    effectiveAt: z.iso.datetime(),
    createdById: z.string().min(1).optional(),
  }).strict(),
  z.object({ action: z.literal("PUBLISH"), pricingVersionId: z.string().min(1) }).strict(),
  z.object({
    action: z.literal("ACCEPT_CONTRACT"),
    globalTenantId: z.string().min(1),
    pricingVersionId: z.string().min(1),
  }).strict(),
  z.object({
    action: z.literal("SET_USER_ACCESS"),
    globalTenantId: z.string().min(1),
    userId: z.string().min(1),
    isActive: z.boolean(),
  }).strict(),
]);

function mapPricing(record: {
  id: string;
  plan: string;
  version: number;
  currency: string;
  monthlyPrice: unknown;
  branchLimit: number;
  localEmployeeLimit: number;
  deviceLimit: number;
  edgeLimit: number;
  effectiveAt: Date;
  status: string;
  publishedAt: Date | null;
  createdById: string | null;
}): RestPricingRecord {
  return {
    id: record.id,
    plan: restPlanSchema.parse(record.plan),
    version: record.version,
    currency: record.currency,
    monthlyPrice: Number(record.monthlyPrice),
    limits: {
      branches: record.branchLimit,
      localEmployees: record.localEmployeeLimit,
      devices: record.deviceLimit,
      edgeInstallations: record.edgeLimit,
    },
    effectiveAt: record.effectiveAt.toISOString(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).parse(record.status),
    publishedAt: record.publishedAt?.toISOString() ?? null,
    createdById: record.createdById ?? "system",
  };
}

const repository: RestEntitlementRepository = {
  async nextVersion(plan) {
    const result = await prisma.restPricingVersion.aggregate({ where: { plan }, _max: { version: true } });
    return (result._max.version ?? 0) + 1;
  },
  async createPricingVersion(input) {
    return mapPricing(await prisma.restPricingVersion.create({
      data: {
        plan: input.plan,
        version: input.version,
        currency: input.currency,
        monthlyPrice: input.monthlyPrice,
        branchLimit: input.limits.branches,
        localEmployeeLimit: input.limits.localEmployees,
        deviceLimit: input.limits.devices,
        edgeLimit: input.limits.edgeInstallations,
        status: input.status,
        effectiveAt: new Date(input.effectiveAt),
        publishedAt: null,
        createdById: input.createdById,
      },
    }));
  },
  async findPricingVersion(id) {
    const record = await prisma.restPricingVersion.findUnique({ where: { id } });
    return record ? mapPricing(record) : null;
  },
  async publishPricingVersion(id, publishedAt) {
    const updated = await prisma.restPricingVersion.updateMany({
      where: { id, status: "DRAFT" },
      data: { status: "PUBLISHED", publishedAt: new Date(publishedAt) },
    });
    if (updated.count !== 1) return null;
    const record = await prisma.restPricingVersion.findUnique({ where: { id } });
    return record ? mapPricing(record) : null;
  },
  async upsertTenantContract(input) {
    await prisma.$transaction(async (tx) => {
      await tx.tenantRestContract.upsert({
        where: { tenantId: input.globalTenantId },
        update: {
          pricingVersionId: input.pricingVersionId,
          plan: input.plan,
          status: input.status,
          agreedMonthlyPrice: input.monthlyPrice,
          currency: input.currency,
          branchLimit: input.limits.branches,
          localEmployeeLimit: input.limits.localEmployees,
          deviceLimit: input.limits.devices,
          edgeLimit: input.limits.edgeInstallations,
          acceptedVersion: input.acceptedVersion,
          suspendedAt: null,
        },
        create: {
          tenantId: input.globalTenantId,
          pricingVersionId: input.pricingVersionId,
          plan: input.plan,
          status: input.status,
          agreedMonthlyPrice: input.monthlyPrice,
          currency: input.currency,
          branchLimit: input.limits.branches,
          localEmployeeLimit: input.limits.localEmployees,
          deviceLimit: input.limits.devices,
          edgeLimit: input.limits.edgeInstallations,
          acceptedVersion: input.acceptedVersion,
        },
      });
      await tx.tenantModule.upsert({
        where: { tenantId_moduleId: { tenantId: input.globalTenantId, moduleId: "vase_rest" } },
        update: { isActive: true, activatedAt: new Date() },
        create: { tenantId: input.globalTenantId, moduleId: "vase_rest", isActive: true, activatedAt: new Date() },
      });
    });
    return input;
  },
};

const entitlementService = createRestEntitlementService(repository);

export async function listRestAdminData() {
  const [records, tenants] = await Promise.all([
    prisma.restPricingVersion.findMany({ orderBy: [{ plan: "asc" }, { version: "desc" }] }),
    prisma.tenant.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        restContract: {
          select: {
            pricingVersionId: true,
            plan: true,
            status: true,
            acceptedVersion: true,
            agreedMonthlyPrice: true,
            currency: true,
          },
        },
        memberships: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "asc" },
          select: {
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                moduleAccesses: { select: { moduleId: true, isActive: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    versions: records.map(mapPricing),
    contractTenants: tenants.map((tenant) => ({
      globalTenantId: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      members: tenant.memberships.map((membership) => {
        const explicitAccess = membership.user.moduleAccesses;
        const restAccess = explicitAccess.find((access) => access.moduleId === "vase_rest");
        return {
          id: membership.user.id,
          name: membership.user.name,
          email: membership.user.email,
          role: membership.role,
          hasExplicitModuleAccess: explicitAccess.length > 0,
          hasRestAccess: tenant.restContract?.status === "ACTIVE" &&
            (explicitAccess.length === 0 || restAccess?.isActive === true),
        };
      }),
      restContract: tenant.restContract ? {
        pricingVersionId: tenant.restContract.pricingVersionId,
        plan: tenant.restContract.plan,
        status: tenant.restContract.status,
        contractVersion: tenant.restContract.acceptedVersion,
        monthlyPrice: Number(tenant.restContract.agreedMonthlyPrice),
        currency: tenant.restContract.currency,
      } : null,
    })),
  };
}

export async function executeRestAdminCommand(rawCommand: unknown, actorUserId?: string) {
  const command = restAdminCommandSchema.parse(rawCommand);
  if (command.action === "CREATE_DRAFT") {
    const createdById = actorUserId ?? command.createdById;
    if (!createdById) throw new Error("REST_ADMIN_ACTOR_REQUIRED");
    return entitlementService.createDraft({ ...command, createdById });
  }
  if (command.action === "PUBLISH") {
    return entitlementService.publish(command.pricingVersionId);
  }

  await ensureModuleCatalogSynced();
  if (command.action === "SET_USER_ACCESS") {
    const [membership, contract, currentAccess] = await Promise.all([
      prisma.membership.findFirst({
        where: { tenantId: command.globalTenantId, userId: command.userId, status: "ACTIVE" },
        select: { id: true },
      }),
      prisma.tenantRestContract.findUnique({ where: { tenantId: command.globalTenantId }, select: { status: true } }),
      getTenantModulesAccess(command.globalTenantId, command.userId),
    ]);
    if (!membership) throw new Error("REST_TENANT_MEMBER_NOT_FOUND");
    if (contract?.status !== "ACTIVE") throw new Error("REST_CONTRACT_REQUIRED");
    if (!currentAccess) throw new Error("REST_TENANT_NOT_FOUND");

    await prisma.$transaction(currentAccess.modules.map((moduleItem) =>
      prisma.userModuleAccess.upsert({
        where: { userId_moduleId: { userId: command.userId, moduleId: moduleItem.id } },
        update: { isActive: moduleItem.id === "vase_rest" ? command.isActive : moduleItem.isActive },
        create: { userId: command.userId, moduleId: moduleItem.id, isActive: moduleItem.id === "vase_rest" ? command.isActive : moduleItem.isActive },
      }),
    ));
    return { globalTenantId: command.globalTenantId, userId: command.userId, isActive: command.isActive };
  }

  const contract = await entitlementService.acceptForTenant(command);
  return restEntitlementSchema.parse({
    globalTenantId: contract.globalTenantId,
    plan: contract.plan,
    status: contract.status,
    limits: contract.limits,
    contractVersion: contract.acceptedVersion,
  });
}

export function restAdminErrorStatus(error: unknown) {
  const message = error instanceof Error ? error.message : "REST_ADMIN_FAILED";
  if (message === "UNAUTHENTICATED") return 401;
  if (message === "FORBIDDEN" || message === "EMAIL_NOT_VERIFIED") return 403;
  if (message.includes("NOT_FOUND")) return 404;
  if (message.includes("ALREADY") || message.includes("NOT_PUBLISHED") || message.includes("CONTRACT_REQUIRED")) return 409;
  if (error instanceof z.ZodError) return 400;
  return 500;
}

export async function getRestAdminOperations() {
  const baseUrl = process.env.REST_INTERNAL_URL ?? "http://vase-rest:3009";
  const requestHeaders = {
    authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN ?? ""}`,
    accept: "application/json",
  };
  const request = (path: string) => fetch(new URL(path, baseUrl), {
    headers: requestHeaders,
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });

  try {
    const [healthResponse, tenantsResponse, edgesResponse] = await Promise.all([
      request("/api/internal/admin/health"),
      request("/api/internal/admin/tenants"),
      request("/api/internal/admin/edges"),
    ]);
    if (!tenantsResponse.ok || !edgesResponse.ok) {
      throw new Error("REST_ADMIN_UPSTREAM_FAILED");
    }
    const [healthPayload, tenantsPayload, edgesPayload] = await Promise.all([
      healthResponse.json().catch(() => ({})),
      tenantsResponse.json(),
      edgesResponse.json(),
    ]);
    return {
      health: healthResponse.ok && healthPayload.status === "ok" ? "ok" as const : "degraded" as const,
      generatedAt: tenantsPayload.generatedAt ?? new Date().toISOString(),
      tenants: Array.isArray(tenantsPayload.tenants) ? tenantsPayload.tenants : [],
      edges: Array.isArray(edgesPayload.edges) ? edgesPayload.edges : [],
    };
  } catch (error) {
    if (error instanceof Error && error.message === "REST_ADMIN_UPSTREAM_FAILED") throw error;
    throw new Error("REST_ADMIN_UPSTREAM_UNAVAILABLE");
  }
}
