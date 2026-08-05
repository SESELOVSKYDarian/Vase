import { Prisma, type CommercialAccessStatus } from "@prisma/client";
import { z } from "zod";
import {
  clientProductAccessSchema,
  buildLabsWorkspaceEntitlementData,
  type ClientProductAccess,
} from "@/lib/admin/client-product-access";
import { getManagedUserAccessModuleIds, userAccessModuleIds } from "@/lib/admin/user-access";
import { applyRestContractWithTx } from "@/server/services/rest-admin";

const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

function trialExpiry(status: "TRIAL" | "ACTIVE", current: Date | null | undefined, now: Date) {
  if (status === "ACTIVE") return null;
  return current && current > now ? current : new Date(now.getTime() + TRIAL_DURATION_MS);
}

function normalizeSlugPart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function deterministicTenantSlug(seed: string, ownerUserId: string) {
  const ownerSuffix = normalizeSlugPart(ownerUserId);
  if (!ownerSuffix) throw new Error("CLIENT_OWNER_ID_INVALID");
  const maximumLength = 191;
  const baseLimit = Math.max(1, maximumLength - ownerSuffix.length - 1);
  const base = (normalizeSlugPart(seed) || "cliente").slice(0, baseLimit).replace(/-+$/g, "") || "c";
  return `${base}-${ownerSuffix}`;
}

const legacyClientAccessSchema = z.object({
  tenantPlan: z.enum(["TRIAL", "PRO"]),
  proSubmoduleIds: z.array(z.string().min(1)).default([]),
  proSubmoduleId: z.string().min(1).nullable().optional(),
}).passthrough();

type LegacyAdapterTransaction = Pick<
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

async function resolveExistingOwnerTenantId(
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
  return legacyOwnerMemberships[0]
    ? { tenantId: legacyOwnerMemberships[0].tenantId, legacy: true as const }
    : null;
}

function isPrismaUniqueConflict(error: unknown) {
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

function assertFeatureValue(
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

function moduleCommercialStatus(statuses: Array<"TRIAL" | "ACTIVE">) {
  return statuses.includes("ACTIVE") ? "ACTIVE" as const : "TRIAL" as const;
}

function nextActivatedAt(
  current: { isActive: boolean; commercialStatus: CommercialAccessStatus; activatedAt: Date | null } | undefined,
  status: "TRIAL" | "ACTIVE",
  now: Date,
) {
  return current?.isActive && current.commercialStatus === status && current.activatedAt
    ? current.activatedAt
    : now;
}

export async function applyClientProductAccess(input: {
  tx: Prisma.TransactionClient;
  actorUserId: string;
  ownerUserId: string;
  ownerName: string;
  ownerEmail: string;
  access: ClientProductAccess;
  businessFeatureMode?: "REPLACE" | "PRESERVE";
  tenantSlugSeed?: string;
  now?: Date;
}) {
  const access = clientProductAccessSchema.parse(input.access);
  await lockClientOwnerWithTx(input.tx, input.ownerUserId);
  const now = input.now ?? new Date();
  const managedModuleIds = getManagedUserAccessModuleIds();
  const requestedBusinessIds = access.business?.submodules.map((submodule) => submodule.id) ?? [];
  const requestedFeatureIds = access.business?.submodules.flatMap((submodule) => submodule.features.map((feature) => feature.featureId)) ?? [];
  const requestedSubmoduleIds = [
    ...requestedBusinessIds,
    ...(access.labs ? [access.labs.submoduleId] : []),
  ];
  const selectedModuleIds = [
    ...(access.business ? [userAccessModuleIds.business] : []),
    ...(access.labs ? [userAccessModuleIds.labs] : []),
    ...(access.management ? [userAccessModuleIds.management] : []),
    ...(access.rest ? [userAccessModuleIds.rest] : []),
  ];

  const existingOwnerTenant = await resolveExistingOwnerTenantId(input.tx, input.ownerUserId);
  const [moduleCatalog, submoduleCatalog, businessFeatures, publishedRestPricing] = await Promise.all([
    input.tx.module.findMany({
      where: { id: { in: managedModuleIds } },
      select: { id: true, product: true, isActive: true },
    }),
    input.tx.moduleSubmodule.findMany({
      where: { moduleId: { in: [userAccessModuleIds.business, userAccessModuleIds.labs] } },
      select: { id: true, moduleId: true, key: true, isActive: true },
    }),
    input.tx.moduleFeature.findMany({
      where: { moduleId: userAccessModuleIds.business },
      select: { id: true, moduleId: true, submoduleId: true, valueType: true, minValue: true, maxValue: true, isActive: true },
    }),
    access.rest
      ? input.tx.restPricingVersion.findFirst({ where: { id: access.rest.pricingVersionId, status: "PUBLISHED" }, select: { id: true } })
      : Promise.resolve(null),
  ]);

  const modulesById = new Map(moduleCatalog.map((module) => [module.id, module]));
  const expectedProduct = new Map([
    [userAccessModuleIds.business, "BUSINESS"],
    [userAccessModuleIds.labs, "LABS"],
    [userAccessModuleIds.management, "MANAGEMENT"],
    [userAccessModuleIds.rest, "REST"],
  ]);
  for (const moduleId of selectedModuleIds) {
    const catalog = modulesById.get(moduleId);
    if (!catalog?.isActive || catalog.product !== expectedProduct.get(moduleId)) {
      throw new Error("CLIENT_MODULE_CATALOG_INVALID");
    }
  }
  if (access.rest && !publishedRestPricing) throw new Error("REST_PRICING_NOT_PUBLISHED");

  const submodulesById = new Map(submoduleCatalog.map((submodule) => [submodule.id, submodule]));
  for (const requested of access.business?.submodules ?? []) {
    const catalog = submodulesById.get(requested.id);
    if (!catalog?.isActive || catalog.moduleId !== userAccessModuleIds.business || catalog.key !== requested.key) {
      throw new Error("CLIENT_BUSINESS_SUBMODULE_INVALID");
    }
  }
  if (requestedBusinessIds.length !== new Set(requestedBusinessIds).size) {
    throw new Error("CLIENT_BUSINESS_SUBMODULE_INVALID");
  }

  if (access.labs) {
    const catalog = submodulesById.get(access.labs.submoduleId);
    if (
      !catalog?.isActive ||
      catalog.moduleId !== userAccessModuleIds.labs ||
      catalog.key.toUpperCase() !== access.labs.plan
    ) throw new Error("CLIENT_LABS_PLAN_INVALID");
  }

  if (requestedFeatureIds.length !== new Set(requestedFeatureIds).size) {
    throw new Error("CLIENT_FEATURE_SCOPE_INVALID");
  }
  const featuresById = new Map(businessFeatures.map((feature) => [feature.id, feature]));
  for (const submodule of access.business?.submodules ?? []) {
    for (const submitted of submodule.features) {
      const feature = featuresById.get(submitted.featureId);
      if (
        !feature?.isActive ||
        feature.moduleId !== userAccessModuleIds.business ||
        (feature.submoduleId !== null && feature.submoduleId !== submodule.id)
      ) throw new Error("CLIENT_FEATURE_SCOPE_INVALID");
      assertFeatureValue(feature, submitted.value);
    }
  }

  let tenantId = existingOwnerTenant?.tenantId;
  if (!tenantId) {
    const slugSeed = input.tenantSlugSeed ?? input.ownerName ?? input.ownerEmail.split("@")[0];
    try {
      const tenant = await input.tx.tenant.upsert({
        where: { primaryOwnerUserId: input.ownerUserId },
        update: {
          name: input.ownerName,
          accountName: input.ownerName,
          billingEmail: input.ownerEmail,
          onboardingProduct: selectedModuleIds.includes(userAccessModuleIds.labs)
            ? selectedModuleIds.includes(userAccessModuleIds.business) ? "BOTH" : "LABS"
            : "BUSINESS",
          status: "ACTIVE",
        },
        create: {
          primaryOwnerUserId: input.ownerUserId,
          name: input.ownerName,
          accountName: input.ownerName,
          slug: deterministicTenantSlug(slugSeed, input.ownerUserId),
          billingEmail: input.ownerEmail,
          industry: "General",
          onboardingProduct: selectedModuleIds.includes(userAccessModuleIds.labs)
            ? selectedModuleIds.includes(userAccessModuleIds.business) ? "BOTH" : "LABS"
            : "BUSINESS",
          status: "ACTIVE",
        },
        select: { id: true },
      });
      tenantId = tenant.id;
    } catch (error) {
      if (isPrismaUniqueConflict(error)) throw new Error("CLIENT_PRIMARY_OWNER_RACE_CONFLICT");
      throw error;
    }
  } else {
    if (existingOwnerTenant?.legacy) {
      const claimed = await input.tx.tenant.updateMany({
        where: { id: tenantId, primaryOwnerUserId: null },
        data: { primaryOwnerUserId: input.ownerUserId },
      });
      if (claimed.count !== 1) {
        const current = await input.tx.tenant.findUnique({
          where: { id: tenantId },
          select: { primaryOwnerUserId: true },
        });
        if (current?.primaryOwnerUserId !== input.ownerUserId) {
          throw new Error("CLIENT_PRIMARY_OWNER_CONFLICT");
        }
      }
    }
    await input.tx.tenant.update({
      where: { id: tenantId },
      data: {
        name: input.ownerName,
        accountName: input.ownerName,
        billingEmail: input.ownerEmail,
        onboardingProduct: selectedModuleIds.includes(userAccessModuleIds.labs)
          ? selectedModuleIds.includes(userAccessModuleIds.business) ? "BOTH" : "LABS"
          : "BUSINESS",
        status: "ACTIVE",
      },
    });
  }

  await input.tx.membership.upsert({
    where: { userId_tenantId: { userId: input.ownerUserId, tenantId } },
    update: { role: "OWNER", status: "ACTIVE" },
    create: {
      userId: input.ownerUserId,
      tenantId,
      createdByUserId: input.actorUserId,
      role: "OWNER",
      status: "ACTIVE",
    },
  });

  const businessCatalogIds = submoduleCatalog
    .filter((item) => item.moduleId === userAccessModuleIds.business && (item.key === "plantilla" || item.key === "personalizado"))
    .map((item) => item.id);
  const labsCatalogIds = submoduleCatalog.filter((item) => item.moduleId === userAccessModuleIds.labs).map((item) => item.id);
  const [existingModules, existingSubmodules] = await Promise.all([
    input.tx.tenantModule.findMany({
      where: { tenantId, moduleId: { in: managedModuleIds } },
      select: { moduleId: true, isActive: true, commercialStatus: true, trialEndsAt: true, activatedAt: true },
    }),
    requestedSubmoduleIds.length
      ? input.tx.tenantSubmodule.findMany({
          where: { tenantId, submoduleId: { in: requestedSubmoduleIds } },
          select: { submoduleId: true, isActive: true, commercialStatus: true, trialEndsAt: true, activatedAt: true },
        })
      : Promise.resolve([]),
  ]);
  const moduleExpiry = new Map(existingModules.map((item) => [item.moduleId, item.trialEndsAt]));
  const submoduleExpiry = new Map(existingSubmodules.map((item) => [item.submoduleId, item.trialEndsAt]));
  const moduleState = new Map(existingModules.map((item) => [item.moduleId, item]));
  const submoduleState = new Map(existingSubmodules.map((item) => [item.submoduleId, item]));

  await input.tx.tenantModule.updateMany({
    where: {
      tenantId,
      moduleId: { in: managedModuleIds },
      NOT: { moduleId: { in: selectedModuleIds } },
    },
    data: { isActive: false, activatedAt: null },
  });

  const ordinaryModuleStates: Array<{ moduleId: string; status: "TRIAL" | "ACTIVE" }> = [];
  if (access.business) ordinaryModuleStates.push({
    moduleId: userAccessModuleIds.business,
    status: moduleCommercialStatus(access.business!.submodules.map((item) => item.status)),
  });
  if (access.labs) ordinaryModuleStates.push({ moduleId: userAccessModuleIds.labs, status: access.labs.status });
  if (access.management) ordinaryModuleStates.push({ moduleId: userAccessModuleIds.management, status: access.management.status });

  for (const selected of ordinaryModuleStates) {
    const data = {
      isActive: true,
      commercialStatus: selected.status as CommercialAccessStatus,
      trialEndsAt: trialExpiry(selected.status, moduleExpiry.get(selected.moduleId), now),
      activatedAt: nextActivatedAt(moduleState.get(selected.moduleId), selected.status, now),
    };
    await input.tx.tenantModule.upsert({
      where: { tenantId_moduleId: { tenantId, moduleId: selected.moduleId } },
      update: data,
      create: { tenantId, moduleId: selected.moduleId, ...data },
    });
  }

  await input.tx.tenantSubmodule.updateMany({
    where: {
      tenantId,
      submoduleId: { in: businessCatalogIds },
      NOT: { submoduleId: { in: requestedBusinessIds } },
    },
    data: { isActive: false, activatedAt: null },
  });
  for (const selected of access.business?.submodules ?? []) {
    const data = {
      isActive: true,
      commercialStatus: selected.status as CommercialAccessStatus,
      trialEndsAt: trialExpiry(selected.status, submoduleExpiry.get(selected.id), now),
      activatedAt: nextActivatedAt(submoduleState.get(selected.id), selected.status, now),
    };
    await input.tx.tenantSubmodule.upsert({
      where: { tenantId_submoduleId: { tenantId, submoduleId: selected.id } },
      update: data,
      create: { tenantId, submoduleId: selected.id, ...data },
    });
  }

  if (input.businessFeatureMode !== "PRESERVE") {
    const explicitlySubmittedFeatureIds = new Set(requestedFeatureIds);
    const businessFeatureIds = businessFeatures
      .filter((feature) =>
        (feature.submoduleId !== null && requestedBusinessIds.includes(feature.submoduleId)) ||
        (feature.submoduleId === null && explicitlySubmittedFeatureIds.has(feature.id)))
      .map((feature) => feature.id);
    if (businessFeatureIds.length) {
      await input.tx.tenantFeatureGrant.deleteMany({
        where: { tenantId, featureId: { in: businessFeatureIds } },
      });
    }
    for (const submitted of access.business?.submodules.flatMap((submodule) => submodule.features) ?? []) {
      const data = {
        enabled: submitted.enabled,
        value: submitted.value === null ? Prisma.JsonNull : submitted.value,
      };
      await input.tx.tenantFeatureGrant.upsert({
        where: { tenantId_featureId: { tenantId, featureId: submitted.featureId } },
        update: data,
        create: { tenantId, featureId: submitted.featureId, ...data },
      });
    }
  }

  await input.tx.tenantSubmodule.updateMany({
    where: {
      tenantId,
      submoduleId: { in: labsCatalogIds },
      NOT: { submoduleId: { in: access.labs ? [access.labs.submoduleId] : [] } },
    },
    data: { isActive: false, activatedAt: null },
  });
  if (access.labs) {
    const data = {
      isActive: true,
      commercialStatus: access.labs.status as CommercialAccessStatus,
      trialEndsAt: trialExpiry(access.labs.status, submoduleExpiry.get(access.labs.submoduleId), now),
      activatedAt: nextActivatedAt(submoduleState.get(access.labs.submoduleId), access.labs.status, now),
    };
    await input.tx.tenantSubmodule.upsert({
      where: { tenantId_submoduleId: { tenantId, submoduleId: access.labs.submoduleId } },
      update: data,
      create: { tenantId, submoduleId: access.labs.submoduleId, ...data },
    });

    const workspaceEntitlement = buildLabsWorkspaceEntitlementData(access.labs.plan);
    const workspaceData = {
      ...workspaceEntitlement,
      channelLimits: workspaceEntitlement.channelLimits as Prisma.InputJsonValue,
      channelOverrideReason: null,
      channelOverrideBy: null,
      channelOverrideAt: null,
    };
    await input.tx.tenantAiWorkspace.upsert({
      where: { tenantId },
      update: workspaceData,
      create: {
        tenantId,
        ...workspaceData,
        assistantDisplayName: `${input.ownerName.trim() || "Vase"} AI`,
        tone: "PROFESSIONAL",
        trainingStatus: "DRAFT",
        timezone: "America/Argentina/Buenos_Aires",
        humanEscalationEnabled: false,
        escalationDestination: "EMAIL",
        escalationContact: input.ownerEmail,
        scrapingEnabled: true,
      },
    });
  }

  if (access.rest) {
    await applyRestContractWithTx(input.tx, {
      globalTenantId: tenantId,
      pricingVersionId: access.rest.pricingVersionId,
      status: access.rest.status,
      now,
    });
  } else {
    await input.tx.tenantRestContract.updateMany({
      where: { tenantId, status: { not: "SUSPENDED" } },
      data: { status: "SUSPENDED", suspendedAt: now },
    });
  }

  await input.tx.userModuleAccess.updateMany({
    where: {
      userId: input.ownerUserId,
      moduleId: { in: managedModuleIds },
      NOT: { moduleId: { in: selectedModuleIds } },
    },
    data: { isActive: false },
  });
  for (const moduleId of selectedModuleIds) {
    await input.tx.userModuleAccess.upsert({
      where: { userId_moduleId: { userId: input.ownerUserId, moduleId } },
      update: { isActive: true },
      create: { userId: input.ownerUserId, moduleId, isActive: true },
    });
  }

  return { tenantId, activeModuleIds: selectedModuleIds };
}
