// Parte de client-product-access.ts: TRIAL_DURATION_MS, trialExpiry, normalizeSlugPart, deterministicTenantSlug, legacyClientAccessSchema, LegacyAdapterTransaction y más.
import { TRIAL_DAYS } from "@/server/services/trial/trial-rules";
import { Prisma, type CommercialAccessStatus } from "@prisma/client";
import { z } from "zod";
import { clientProductAccessSchema, type ClientProductAccess } from "@/lib/admin/client-product-access";
import { userAccessModuleIds } from "@/lib/admin/user-access";

// Misma duración que la prueba gratis de una cuenta nueva (7 días).
export const TRIAL_DURATION_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

export function trialExpiry(status: "TRIAL" | "ACTIVE", current: Date | null | undefined, now: Date) {
  if (status === "ACTIVE") return null;
  return current && current > now ? current : new Date(now.getTime() + TRIAL_DURATION_MS);
}

export function normalizeSlugPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function deterministicTenantSlug(seed: string, ownerUserId: string) {
  const ownerSuffix = normalizeSlugPart(ownerUserId);
  if (!ownerSuffix) throw new Error("CLIENT_OWNER_ID_INVALID");
  const maximumLength = 191;
  const baseLimit = Math.max(1, maximumLength - ownerSuffix.length - 1);
  const base = (normalizeSlugPart(seed) || "cliente").slice(0, baseLimit).replace(/-+$/g, "") || "c";
  return `${base}-${ownerSuffix}`;
}

export const legacyClientAccessSchema = z.object({
  tenantPlan: z.enum(["TRIAL", "PRO"]),
  proSubmoduleIds: z.array(z.string().min(1)).default([]),
  proSubmoduleId: z.string().min(1).nullable().optional(),
}).passthrough();

export type LegacyAdapterTransaction = Pick<
  Prisma.TransactionClient,
  "$queryRaw" | "tenant" | "membership" | "moduleSubmodule" | "tenantSubmodule" | "tenantRestContract" | "restPricingVersion"
>;

export async function lockClientOwnerWithTx(
  tx: Pick<Prisma.TransactionClient, "$queryRaw">,
  ownerUserId: string,
) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`SELECT \`id\` FROM \`User\` WHERE \`id\` = ${ownerUserId} FOR UPDATE`,
  );
  if (rows.length !== 1 || rows[0].id !== ownerUserId) throw new Error("CLIENT_OWNER_NOT_FOUND");
}

export async function resolveExistingOwnerTenantId(
  tx: Pick<Prisma.TransactionClient, "tenant" | "membership">,
  ownerUserId: string,
) {
  const primaryTenant = await tx.tenant.findUnique({
    where: { primaryOwnerUserId: ownerUserId },
    select: { id: true },
  });
  if (primaryTenant) return { tenantId: primaryTenant.id, legacy: false as const };

  const legacyOwnerMemberships = await tx.membership.findMany({
    where: { userId: ownerUserId, role: "OWNER" },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 2,
    select: { tenantId: true },
  });
  if (legacyOwnerMemberships.length > 1) throw new Error("CLIENT_OWNER_TENANT_AMBIGUOUS");
  if (legacyOwnerMemberships[0]) {
    const tenantOwnerCount = await tx.membership.count({
      where: { tenantId: legacyOwnerMemberships[0].tenantId, role: "OWNER" },
    });
    if (tenantOwnerCount !== 1) throw new Error("CLIENT_TENANT_OWNER_AMBIGUOUS");
  }
  if (legacyOwnerMemberships.length === 0) {
    const teamMemberships = await tx.membership.findMany({
      where: { userId: ownerUserId, role: { in: ["MANAGER", "MEMBER"] } },
      take: 1,
      select: { id: true },
    });
    if (teamMemberships.length > 0) throw new Error("CLIENT_TEAM_MEMBER_OWNER_PROVISIONING_FORBIDDEN");
  }
  return legacyOwnerMemberships[0]
    ? { tenantId: legacyOwnerMemberships[0].tenantId, legacy: true as const }
    : null;
}

export function isPrismaUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function adaptLegacyClientProductAccessWithTx(input: {
  tx: LegacyAdapterTransaction;
  ownerUserId: string;
  moduleIds: string[];
  rawConfig: unknown;
  storedAccess?: ClientProductAccess | null;
  now?: Date;
}): Promise<ClientProductAccess> {
  await lockClientOwnerWithTx(input.tx, input.ownerUserId);
  const legacy = legacyClientAccessSchema.parse(input.rawConfig);
  const status = legacy.tenantPlan === "PRO" ? "ACTIVE" as const : "TRIAL" as const;
  const selectedLegacyIds = Array.from(new Set([
    ...legacy.proSubmoduleIds,
    ...(legacy.proSubmoduleId ? [legacy.proSubmoduleId] : []),
  ]));
  const wantsBusiness = input.moduleIds.includes(userAccessModuleIds.business);
  const wantsLabs = input.moduleIds.includes(userAccessModuleIds.labs);
  const wantsRest = input.moduleIds.includes(userAccessModuleIds.rest);

  const catalog = wantsBusiness || wantsLabs
    ? await input.tx.moduleSubmodule.findMany({
        where: {
          moduleId: { in: [
            ...(wantsBusiness ? [userAccessModuleIds.business] : []),
            ...(wantsLabs ? [userAccessModuleIds.labs] : []),
          ] },
          isActive: true,
        },
        select: { id: true, moduleId: true, key: true, isActive: true },
      })
    : [];

  const managedBusinessCatalog = catalog.filter((item) =>
    item.isActive &&
    item.moduleId === userAccessModuleIds.business &&
    (item.key === "plantilla" || item.key === "personalizado"));
  const selectedBusiness = managedBusinessCatalog.filter((item) => selectedLegacyIds.includes(item.id));

  const labsPlanByKey = new Map<string, "STARTER" | "PRO" | "GROWTH">([
    ["starter", "STARTER"],
    ["pro", "PRO"],
    ["growth", "GROWTH"],
  ]);
  const labsRank = new Map([["STARTER", 1], ["PRO", 2], ["GROWTH", 3]]);
  const selectedLabsCatalog = catalog
    .filter((item) => item.isActive && item.moduleId === userAccessModuleIds.labs && selectedLegacyIds.includes(item.id) && labsPlanByKey.has(item.key))
    .sort((left, right) => (labsRank.get(labsPlanByKey.get(right.key)!) ?? 0) - (labsRank.get(labsPlanByKey.get(left.key)!) ?? 0))[0]
    ?? catalog.find((item) => item.isActive && item.moduleId === userAccessModuleIds.labs && item.key === "starter");
  if (wantsLabs && !input.storedAccess?.labs && !selectedLabsCatalog) throw new Error("CLIENT_LABS_PLAN_INVALID");

  const needsMembership = (wantsRest && !input.storedAccess?.rest) ||
    (wantsBusiness && !input.storedAccess?.business && selectedBusiness.length === 0);
  const ownerTenant = needsMembership
    ? await resolveExistingOwnerTenantId(input.tx, input.ownerUserId)
    : null;
  const activeBusinessLinks = wantsBusiness && !input.storedAccess?.business && selectedBusiness.length === 0 && ownerTenant
    ? await input.tx.tenantSubmodule.findMany({
        where: {
          tenantId: ownerTenant.tenantId,
          submoduleId: { in: managedBusinessCatalog.map((item) => item.id) },
          isActive: true,
        },
        select: { submoduleId: true, commercialStatus: true },
      })
    : [];
  const activeBusinessById = new Map(activeBusinessLinks.map((link) => [link.submoduleId, link]));
  const synthesizedBusiness = selectedBusiness.length
    ? selectedBusiness.map((item) => ({ id: item.id, key: item.key, status, features: [] }))
    : managedBusinessCatalog
        .filter((item) => activeBusinessById.has(item.id))
        .map((item) => ({
          id: item.id,
          key: item.key,
          status: activeBusinessById.get(item.id)?.commercialStatus === "ACTIVE" ? "ACTIVE" as const : "TRIAL" as const,
          features: [],
        }));

  let rest: ClientProductAccess["rest"] = null;
  if (wantsRest) {
    if (input.storedAccess?.rest) {
      rest = input.storedAccess.rest;
    } else {
      const existingContract = ownerTenant
        ? await input.tx.tenantRestContract.findUnique({
            where: { tenantId: ownerTenant.tenantId },
            select: { pricingVersionId: true, status: true },
          })
        : null;
      if (existingContract) {
        rest = {
          pricingVersionId: existingContract.pricingVersionId,
          status: existingContract.status === "TRIAL" ? "TRIAL" : "ACTIVE",
        };
      } else {
        const eligible = await input.tx.restPricingVersion.findMany({
          where: {
            plan: "STARTER",
            status: "PUBLISHED",
            effectiveAt: { lte: input.now ?? new Date() },
          },
          select: { id: true },
          take: 2,
        });
        if (eligible.length !== 1) throw new Error("CLIENT_LEGACY_REST_PLAN_REQUIRED");
        rest = { pricingVersionId: eligible[0].id, status };
      }
    }
  }

  return clientProductAccessSchema.parse({
    business: wantsBusiness
      ? input.storedAccess?.business ?? { submodules: synthesizedBusiness }
      : null,
    labs: wantsLabs
      ? input.storedAccess?.labs ?? (selectedLabsCatalog
        ? { submoduleId: selectedLabsCatalog.id, plan: labsPlanByKey.get(selectedLabsCatalog.key), status }
        : null)
      : null,
    rest,
    management: input.moduleIds.includes(userAccessModuleIds.management)
      ? input.storedAccess?.management ?? { status }
      : null,
  });
}

export function assertFeatureValue(
  feature: { valueType: string; minValue: number | null; maxValue: number | null },
  value: boolean | number | string | null,
) {
  if (value === null) return;
  if (feature.valueType === "BOOLEAN" && typeof value === "boolean") return;
  if (feature.valueType === "TEXT" && typeof value === "string") return;
  if (
    feature.valueType === "INTEGER" &&
    typeof value === "number" &&
    Number.isInteger(value) &&
    (feature.minValue === null || value >= feature.minValue) &&
    (feature.maxValue === null || value <= feature.maxValue)
  ) return;
  throw new Error("CLIENT_FEATURE_VALUE_INVALID");
}

export function moduleCommercialStatus(statuses: Array<"TRIAL" | "ACTIVE">) {
  return statuses.includes("ACTIVE") ? "ACTIVE" as const : "TRIAL" as const;
}

export function nextActivatedAt(
  current: { isActive: boolean; commercialStatus: CommercialAccessStatus; activatedAt: Date | null } | undefined,
  status: "TRIAL" | "ACTIVE",
  now: Date,
) {
  return current?.isActive && current.commercialStatus === status && current.activatedAt
    ? current.activatedAt
    : now;
}
