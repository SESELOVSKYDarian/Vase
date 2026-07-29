import { prisma } from "@/lib/db/prisma";
import {
  platformModules,
  type PlatformModuleAccess,
} from "@/config/modules";
import {
  ensureModuleCatalogSynced,
  serializePricingType,
} from "@/server/services/modules";

function resolveProductMatch(
  moduleProducts: readonly ("BUSINESS" | "LABS" | "BOTH" | "MANAGEMENT" | "REST")[],
  onboardingProduct: "BUSINESS" | "LABS" | "BOTH",
) {
  return moduleProducts.includes(onboardingProduct) || onboardingProduct === "BOTH";
}

export async function getTenantModulesAccess(tenantId: string, userId?: string) {
  await ensureModuleCatalogSynced();

  const [tenant, userModuleAccesses] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        onboardingProduct: true,
        featureFlags: {
          select: {
            key: true,
            enabled: true,
          },
        },
        storefrontPages: {
          select: { id: true },
          take: 1,
        },
        aiWorkspace: {
          select: { id: true },
        },
        tenantModules: {
          select: {
            moduleId: true,
            isActive: true,
          },
        },
      },
    }),
    userId
      ? prisma.userModuleAccess.findMany({
          where: { userId },
          select: { moduleId: true, isActive: true },
        })
      : Promise.resolve([]),
  ]);

  const userModuleAccessMap = new Map(
    userModuleAccesses.map((access) => [access.moduleId, access.isActive]),
  );
  const hasExplicitUserModuleAccess = userModuleAccessMap.size > 0;

  const userCanAccessModule = (moduleId: string) => {
    if (!hasExplicitUserModuleAccess) return true;
    return userModuleAccessMap.get(moduleId) === true;
  };

  if (!tenant) {
    return null;
  }

  const moduleRows = await prisma.module.findMany({
    where: {
      id: {
        in: platformModules.map((module) => module.id),
      },
    },
    include: {
      pricing: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const enabledFlags = new Set(
    tenant.featureFlags.filter((flag) => flag.enabled).map((flag) => flag.key),
  );
  const tenantModuleMap = new Map(
    tenant.tenantModules.map((tenantModule) => [tenantModule.moduleId, tenantModule.isActive]),
  );

  const modules: PlatformModuleAccess[] = platformModules.map((definition) => {
    const moduleRow = moduleRows.find((entry) => entry.id === definition.id);
    const flagActive = enabledFlags.has(definition.featureFlagKey);
    const hasExplicitTenantModuleAccess = tenantModuleMap.has(definition.id);
    const tenantModuleActive = tenantModuleMap.get(definition.id) ?? false;
    const productActive = resolveProductMatch(definition.supportedProducts, tenant.onboardingProduct);
    const resourceActive =
      definition.key === "business"
        ? tenant.storefrontPages.length > 0 || productActive
        : definition.key === "labs" ? Boolean(tenant.aiWorkspace) || productActive : tenantModuleActive;
    const isActive =
      userCanAccessModule(definition.id) &&
      Boolean(moduleRow?.isActive) &&
      (hasExplicitTenantModuleAccess
        ? tenantModuleActive
        : flagActive || (productActive && resourceActive));
    const isRecommended =
      !isActive &&
      tenant.featureFlags.some(
        (flag) =>
          flag.enabled &&
          definition.recommendedFlagPrefixes.some((prefix) => flag.key.startsWith(prefix)),
      );
    const pricing = moduleRow?.pricing[0];

    return {
      id: definition.id,
      key: definition.key,
      name: definition.name === "vase_business" ? "Vase Business" : definition.name === "vase_labs" ? "Vase Labs" : "Vase Management",
      description: moduleRow?.description ?? definition.description,
      summary: definition.summary,
      route: moduleRow?.route ?? definition.route,
      activationRoute: definition.activationRoute,
      product: definition.product,
      featureFlagKey: definition.featureFlagKey,
      isActive,
      isRecommended,
      status: isActive ? "active" : "inactive",
      statusLabel: isActive ? "Activo" : "No contratado",
      activationMode: definition.activationMode,
      currentPricing: pricing
        ? {
            price: Number(pricing.price),
            currency: pricing.currency,
            type: serializePricingType(pricing.type),
          }
        : definition.defaultPricing ? {
            price: definition.defaultPricing.price,
            currency: definition.defaultPricing.currency,
            type: definition.defaultPricing.type,
          } : null,
      billing: {
        type:
          pricing?.type === "ONE_TIME"
            ? "one_time"
            : definition.billing.type,
        monthlyFrom:
          pricing?.type === "MONTHLY" ? Number(pricing.price) : definition.billing.monthlyFrom,
        setupFrom:
          pricing?.type === "ONE_TIME" ? Number(pricing.price) : definition.billing.setupFrom,
        currency: pricing?.currency ?? definition.billing.currency,
      },
    };
  });

  return {
    tenant: {
      id: tenant.id,
      name: tenant.name,
      onboardingProduct: tenant.onboardingProduct,
    },
    modules,
  };
}
