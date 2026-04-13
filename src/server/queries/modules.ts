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
  moduleProducts: readonly ("BUSINESS" | "LABS" | "BOTH")[],
  onboardingProduct: "BUSINESS" | "LABS" | "BOTH",
) {
  return moduleProducts.includes(onboardingProduct) || onboardingProduct === "BOTH";
}

export async function getTenantModulesAccess(tenantId: string) {
  await ensureModuleCatalogSynced();

  const tenant = await prisma.tenant.findUnique({
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
  });

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
    const tenantModuleActive = tenantModuleMap.get(definition.id) ?? false;
    const productActive = resolveProductMatch(definition.supportedProducts, tenant.onboardingProduct);
    const resourceActive =
      definition.key === "business"
        ? tenant.storefrontPages.length > 0 || productActive
        : Boolean(tenant.aiWorkspace) || productActive;
    const isActive =
      Boolean(moduleRow?.isActive) && (tenantModuleActive || flagActive || (productActive && resourceActive));
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
      name: definition.name === "vase_business" ? "Vase Business" : "Vase Labs",
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
        : {
            price: definition.defaultPricing.price,
            currency: definition.defaultPricing.currency,
            type: definition.defaultPricing.type,
          },
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
