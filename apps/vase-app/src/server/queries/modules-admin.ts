import { ModulePricingType } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getPlatformModuleByKey, platformModules } from "@/config/modules";
import {
  ensureModuleCatalogSynced,
  serializePricingType,
} from "@/server/services/modules";

export async function getAdminModulesCatalog() {
  await ensureModuleCatalogSynced();

  const modules = await prisma.module.findMany({
    orderBy: [{ product: "asc" }, { name: "asc" }],
    include: {
      pricing: {
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      },
      tenantLinks: {
        select: { id: true, tenantId: true, isActive: true, activeArtifactId: true },
      },
      submodules: {
        include: {
          pricing: {
            orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
          },
          tenantLinks: {
            select: { id: true, tenantId: true, isActive: true, activeArtifactId: true },
          },
          artifacts: {
            orderBy: [{ isPublished: "desc" }, { createdAt: "desc" }],
            take: 10,
          },
        },
        orderBy: { createdAt: "asc" },
      },
      artifacts: {
        orderBy: [{ isPublished: "desc" }, { createdAt: "desc" }],
        take: 10,
      },
    },
  });

  const tenants = await prisma.tenant.findMany({
    orderBy: { accountName: "asc" },
    take: 300,
    select: {
      id: true,
      accountName: true,
      name: true,
    },
  });

  return modules.map((module) => {
    const definition =
      platformModules.find((entry) => entry.id === module.id) ??
      getPlatformModuleByKey(module.product === "BUSINESS" ? "business" : module.product === "LABS" ? "labs" : "management");
    const currentPricing =
      module.pricing.find((pricing) => pricing.isActive) ?? module.pricing[0] ?? null;

    return {
      id: module.id,
      name: module.name,
      description: module.description,
      product: module.product,
      route: module.route,
      isActive: module.isActive,
      activeTenants: module.tenantLinks.length,
      tenants,
      artifacts: module.artifacts.map((artifact) => ({
        id: artifact.id,
        version: artifact.version,
        fileName: artifact.fileName,
        sizeBytes: artifact.sizeBytes,
        isPublished: artifact.isPublished,
        publishedAt: artifact.publishedAt,
        createdAt: artifact.createdAt,
      })),
      currentPricing: currentPricing
        ? {
            id: currentPricing.id,
            price: Number(currentPricing.price),
            currency: currentPricing.currency,
            type: serializePricingType(currentPricing.type),
            isActive: currentPricing.isActive,
            updatedAt: currentPricing.updatedAt,
          }
        : definition
          ? {
              id: null,
              price: definition.defaultPricing.price,
              currency: definition.defaultPricing.currency,
              type: definition.defaultPricing.type,
              isActive: true,
              updatedAt: null,
            }
          : null,
      pricingHistory: module.pricing.slice(0, 5).map((pricing) => ({
        id: pricing.id,
        price: Number(pricing.price),
        currency: pricing.currency,
        type: serializePricingType(pricing.type),
        isActive: pricing.isActive,
        createdAt: pricing.createdAt,
      })),
      submodules: module.submodules.map((submodule) => {
        const currentSubPricing = submodule.pricing.find((pricing) => pricing.isActive) ?? submodule.pricing[0] ?? null;
        return {
          id: submodule.id,
          key: submodule.key,
          name: submodule.name,
          description: submodule.description,
          route: submodule.route,
          isActive: submodule.isActive,
          activeTenants: submodule.tenantLinks.filter((link) => link.isActive).length,
          currentPricing: currentSubPricing
            ? {
                id: currentSubPricing.id,
                price: Number(currentSubPricing.price),
                currency: currentSubPricing.currency,
                type: serializePricingType(currentSubPricing.type),
                isActive: currentSubPricing.isActive,
                updatedAt: currentSubPricing.updatedAt,
              }
            : null,
          artifacts: submodule.artifacts.map((artifact) => ({
            id: artifact.id,
            version: artifact.version,
            fileName: artifact.fileName,
            sizeBytes: artifact.sizeBytes,
            isPublished: artifact.isPublished,
            publishedAt: artifact.publishedAt,
            createdAt: artifact.createdAt,
          })),
        };
      }),
    };
  });
}

export async function getModuleById(moduleId: string) {
  await ensureModuleCatalogSynced();

  return prisma.module.findUnique({
    where: { id: moduleId },
    include: {
      pricing: {
        orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      },
      tenantLinks: {
        where: { isActive: true },
        select: { id: true, tenantId: true },
      },
    },
  });
}

export async function calculateTenantModulePricing(tenantId: string) {
  await ensureModuleCatalogSynced();

  const tenantModules = await prisma.tenantModule.findMany({
    where: {
      tenantId,
      isActive: true,
      module: {
        isActive: true,
      },
    },
    include: {
      module: {
        include: {
          pricing: {
            where: { isActive: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  const totals = tenantModules.reduce(
    (accumulator, tenantModule) => {
      const pricing = tenantModule.module.pricing[0];

      if (!pricing) {
        return accumulator;
      }

      const numericPrice = Number(pricing.price);

      if (pricing.type === ModulePricingType.MONTHLY) {
        accumulator.monthly += numericPrice;
      } else {
        accumulator.oneTime += numericPrice;
      }

      return accumulator;
    },
    { monthly: 0, oneTime: 0 },
  );

  return {
    tenantId,
    moduleCount: tenantModules.length,
    currency: tenantModules[0]?.module.pricing[0]?.currency ?? "USD",
    totals,
  };
}

