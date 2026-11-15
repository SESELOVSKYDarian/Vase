// Parte de rest-admin.ts: RestContractTransaction, applyRestContractWithTx, restAdminCommandSchema, mapPricing, repository, entitlementService.
import { restPlanLimitsSchema, restPlanSchema } from "@vase/contracts";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { createRestEntitlementService, type RestEntitlementRepository, type RestPricingRecord } from "@/server/services/rest-entitlements";
import { type CommercialAccessStatus, type Prisma } from "@prisma/client";
import { isRestContractEntitled } from "@/lib/rest/contract-entitlement";

export type RestContractTransaction = Pick<
  Prisma.TransactionClient,
  "restPricingVersion" | "tenantRestContract" | "tenantModule"
>;

export async function applyRestContractWithTx(
  tx: RestContractTransaction,
  input: {
    globalTenantId: string;
    pricingVersionId: string;
    status: Extract<CommercialAccessStatus, "TRIAL" | "ACTIVE">;
    now?: Date;
  },
) {
  const now = input.now ?? new Date();
  const [pricing, currentModule, currentContract] = await Promise.all([
    tx.restPricingVersion.findFirst({
      where: { id: input.pricingVersionId },
    }),
    tx.tenantModule.findUnique({
      where: {
        tenantId_moduleId: {
          tenantId: input.globalTenantId,
          moduleId: "vase_rest",
        },
      },
      select: { trialEndsAt: true, isActive: true, commercialStatus: true, activatedAt: true },
    }),
    tx.tenantRestContract.findUnique({
      where: { tenantId: input.globalTenantId },
      select: { pricingVersionId: true, status: true, activatedAt: true },
    }),
  ]);
  if (!pricing || (
    pricing.status !== "PUBLISHED" && !(
      pricing.status === "ARCHIVED" && currentContract?.pricingVersionId === pricing.id
    )
  )) throw new Error("REST_PRICING_NOT_PUBLISHED");
  const trialEndsAt = input.status === "TRIAL"
    ? currentModule?.trialEndsAt && currentModule.trialEndsAt > now
      ? currentModule.trialEndsAt
      : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    : null;
  const materialContractTransition =
    !currentContract ||
    !isRestContractEntitled(currentContract.status) ||
    currentContract.status !== input.status ||
    currentContract.pricingVersionId !== pricing.id;
  const contractActivatedAt = materialContractTransition || !currentContract.activatedAt
    ? now
    : currentContract.activatedAt;
  const materialModuleTransition =
    !currentModule?.isActive ||
    currentModule.commercialStatus !== input.status ||
    currentContract?.pricingVersionId !== pricing.id;
  const moduleActivatedAt = materialModuleTransition || !currentModule?.activatedAt
    ? now
    : currentModule.activatedAt;

  await tx.tenantRestContract.upsert({
    where: { tenantId: input.globalTenantId },
    update: {
      pricingVersionId: pricing.id,
      plan: pricing.plan,
      status: input.status,
      agreedMonthlyPrice: pricing.monthlyPrice,
      currency: pricing.currency,
      branchLimit: pricing.branchLimit,
      localEmployeeLimit: pricing.localEmployeeLimit,
      deviceLimit: pricing.deviceLimit,
      edgeLimit: pricing.edgeLimit,
      acceptedVersion: pricing.version,
      activatedAt: contractActivatedAt,
      suspendedAt: null,
    },
    create: {
      tenantId: input.globalTenantId,
      pricingVersionId: pricing.id,
      plan: pricing.plan,
      status: input.status,
      agreedMonthlyPrice: pricing.monthlyPrice,
      currency: pricing.currency,
      branchLimit: pricing.branchLimit,
      localEmployeeLimit: pricing.localEmployeeLimit,
      deviceLimit: pricing.deviceLimit,
      edgeLimit: pricing.edgeLimit,
      acceptedVersion: pricing.version,
      activatedAt: contractActivatedAt,
      suspendedAt: null,
    },
  });

  await tx.tenantModule.upsert({
    where: { tenantId_moduleId: { tenantId: input.globalTenantId, moduleId: "vase_rest" } },
    update: {
      isActive: true,
      commercialStatus: input.status,
      trialEndsAt,
      activatedAt: moduleActivatedAt,
    },
    create: {
      tenantId: input.globalTenantId,
      moduleId: "vase_rest",
      isActive: true,
      commercialStatus: input.status,
      trialEndsAt,
      activatedAt: moduleActivatedAt,
    },
  });

  return {
    globalTenantId: input.globalTenantId,
    pricingVersionId: pricing.id,
    plan: pricing.plan,
    status: input.status,
    monthlyPrice: Number(pricing.monthlyPrice),
    currency: pricing.currency,
    limits: {
      branches: pricing.branchLimit,
      localEmployees: pricing.localEmployeeLimit,
      devices: pricing.deviceLimit,
      edgeInstallations: pricing.edgeLimit,
    },
    acceptedVersion: pricing.version,
  };
}

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

export function mapPricing(record: {
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

export const repository: RestEntitlementRepository = {
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
    return prisma.$transaction((tx) => applyRestContractWithTx(tx, {
      globalTenantId: input.globalTenantId,
      pricingVersionId: input.pricingVersionId,
      status: input.status === "TRIAL" ? "TRIAL" : "ACTIVE",
    }));
  },
};

export const entitlementService = createRestEntitlementService(repository);
