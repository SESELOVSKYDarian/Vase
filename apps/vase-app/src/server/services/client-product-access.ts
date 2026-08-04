import { Prisma, type CommercialAccessStatus } from "@prisma/client";
import {
  clientProductAccessSchema,
  getLabsEntitlement,
  type ClientProductAccess,
} from "@/lib/admin/client-product-access";
import { getManagedUserAccessModuleIds, userAccessModuleIds } from "@/lib/admin/user-access";
import { applyRestContractWithTx } from "@/server/services/rest-admin";

const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

function trialExpiry(status: "TRIAL" | "ACTIVE", current: Date | null | undefined, now: Date) {
  if (status === "ACTIVE") return null;
  return current && current > now ? current : new Date(now.getTime() + TRIAL_DURATION_MS);
}

function normalizeSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "cliente";
}

async function uniqueTenantSlug(tx: Prisma.TransactionClient, seed: string) {
  const base = normalizeSlug(seed);
  for (let suffix = 0; suffix < 10_000; suffix++) {
    const slug = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const existing = await tx.tenant.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) return slug;
  }
  throw new Error("CLIENT_TENANT_SLUG_UNAVAILABLE");
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

export async function applyClientProductAccess(input: {
  tx: Prisma.TransactionClient;
  actorUserId: string;
  ownerUserId: string;
  ownerName: string;
  ownerEmail: string;
  access: ClientProductAccess;
  tenantSlugSeed?: string;
  now?: Date;
}) {
  const access = clientProductAccessSchema.parse(input.access);
  const now = input.now ?? new Date();
  const managedModuleIds = getManagedUserAccessModuleIds();
  const requestedBusinessIds = access.business?.submodules.map((submodule) => submodule.id) ?? [];
  const requestedFeatureIds = access.business?.submodules.flatMap((submodule) => submodule.features.map((feature) => feature.featureId)) ?? [];
  const requestedSubmoduleIds = [
    ...requestedBusinessIds,
    ...(access.labs ? [access.labs.submoduleId] : []),
  ];
  const selectedModuleIds = [
    ...(requestedBusinessIds.length ? [userAccessModuleIds.business] : []),
    ...(access.labs ? [userAccessModuleIds.labs] : []),
    ...(access.management ? [userAccessModuleIds.management] : []),
    ...(access.rest ? [userAccessModuleIds.rest] : []),
  ];

  const [membership, moduleCatalog, submoduleCatalog, businessFeatures, publishedRestPricing] = await Promise.all([
    input.tx.membership.findFirst({
      where: { userId: input.ownerUserId },
      orderBy: [{ role: "asc" }, { status: "asc" }, { createdAt: "asc" }],
      select: { tenantId: true },
    }),
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

  let tenantId = membership?.tenantId;
  if (!tenantId) {
    const slugSeed = input.tenantSlugSeed ?? input.ownerName ?? input.ownerEmail.split("@")[0];
    const tenant = await input.tx.tenant.create({
      data: {
        name: input.ownerName,
        accountName: input.ownerName,
        slug: await uniqueTenantSlug(input.tx, slugSeed),
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
  } else {
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
      select: { moduleId: true, trialEndsAt: true },
    }),
    requestedSubmoduleIds.length
      ? input.tx.tenantSubmodule.findMany({
          where: { tenantId, submoduleId: { in: requestedSubmoduleIds } },
          select: { submoduleId: true, trialEndsAt: true },
        })
      : Promise.resolve([]),
  ]);
  const moduleExpiry = new Map(existingModules.map((item) => [item.moduleId, item.trialEndsAt]));
  const submoduleExpiry = new Map(existingSubmodules.map((item) => [item.submoduleId, item.trialEndsAt]));

  await input.tx.tenantModule.updateMany({
    where: {
      tenantId,
      moduleId: { in: managedModuleIds },
      NOT: { moduleId: { in: selectedModuleIds } },
    },
    data: { isActive: false, activatedAt: null },
  });

  const ordinaryModuleStates: Array<{ moduleId: string; status: "TRIAL" | "ACTIVE" }> = [];
  if (requestedBusinessIds.length) ordinaryModuleStates.push({
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
      activatedAt: now,
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
      activatedAt: now,
    };
    await input.tx.tenantSubmodule.upsert({
      where: { tenantId_submoduleId: { tenantId, submoduleId: selected.id } },
      update: data,
      create: { tenantId, submoduleId: selected.id, ...data },
    });
  }

  const businessFeatureIds = businessFeatures
    .filter((feature) => feature.submoduleId === null || businessCatalogIds.includes(feature.submoduleId))
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
      activatedAt: now,
    };
    await input.tx.tenantSubmodule.upsert({
      where: { tenantId_submoduleId: { tenantId, submoduleId: access.labs.submoduleId } },
      update: data,
      create: { tenantId, submoduleId: access.labs.submoduleId, ...data },
    });

    const entitlement = getLabsEntitlement(access.labs.plan);
    const workspaceData = {
      entitlementPlan: access.labs.plan,
      plan: entitlement.legacyPlan,
      monthlyConversationLimit: entitlement.monthlyConversationLimit,
      monthlyKnowledgeItemLimit: entitlement.maxKnowledgeItems,
      maxChannels: entitlement.maxChannels,
      channelLimits: entitlement.channels as Prisma.InputJsonValue,
      maxFiles: entitlement.maxFiles,
      maxUrls: entitlement.maxUrls,
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
