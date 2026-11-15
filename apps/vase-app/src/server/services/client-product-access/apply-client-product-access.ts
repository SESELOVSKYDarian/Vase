// Parte de client-product-access.ts: applyClientProductAccess.
import { Prisma, type CommercialAccessStatus } from "@prisma/client";
import { buildLabsWorkspaceEntitlementData, clientProductAccessSchema, type ClientProductAccess } from "@/lib/admin/client-product-access";
import { getManagedUserAccessModuleIds, userAccessModuleIds } from "@/lib/admin/user-access";
import { applyRestContractWithTx } from "@/server/services/rest-admin";
import { assertFeatureValue, deterministicTenantSlug, isPrismaUniqueConflict, lockClientOwnerWithTx, moduleCommercialStatus, nextActivatedAt, resolveExistingOwnerTenantId, trialExpiry } from "./adapt-legacy-client-product-access-with-tx";

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
  const [moduleCatalog, submoduleCatalog, businessFeatures, selectedRestPricing, currentRestContract] = await Promise.all([
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
      ? input.tx.restPricingVersion.findFirst({ where: { id: access.rest.pricingVersionId }, select: { id: true, status: true } })
      : Promise.resolve(null),
    access.rest && existingOwnerTenant
      ? input.tx.tenantRestContract.findUnique({ where: { tenantId: existingOwnerTenant.tenantId }, select: { pricingVersionId: true } })
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
  if (access.rest && (
    !selectedRestPricing ||
    (selectedRestPricing.status !== "PUBLISHED" && !(
      selectedRestPricing.status === "ARCHIVED" && currentRestContract?.pricingVersionId === selectedRestPricing.id
    ))
  )) throw new Error("REST_PRICING_NOT_PUBLISHED");

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
      },
    });
  }

  await input.tx.membership.upsert({
    where: { userId_tenantId: { userId: input.ownerUserId, tenantId } },
    update: { role: "OWNER" },
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
