import { ModulePricingType, ModuleProduct, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { platformModules } from "@/config/modules";

function toModuleProduct(product: "BUSINESS" | "LABS") {
  return product === "BUSINESS" ? ModuleProduct.BUSINESS : ModuleProduct.LABS;
}

function toModulePricingType(type: "monthly" | "one_time") {
  return type === "monthly" ? ModulePricingType.MONTHLY : ModulePricingType.ONE_TIME;
}

export async function ensureModuleCatalogSynced() {
  await Promise.all(
    platformModules.map(async (definition) => {
      await prisma.module.upsert({
        where: { id: definition.id },
        update: {
          name: definition.name,
          description: definition.description,
          product: toModuleProduct(definition.product),
          route: definition.route,
          isActive: true,
        },
        create: {
          id: definition.id,
          name: definition.name,
          description: definition.description,
          product: toModuleProduct(definition.product),
          route: definition.route,
          isActive: true,
        },
      });

      const pricingCount = await prisma.modulePricing.count({
        where: { moduleId: definition.id },
      });

      if (pricingCount === 0) {
        await prisma.modulePricing.create({
          data: {
            moduleId: definition.id,
            price: definition.defaultPricing.price,
            currency: definition.defaultPricing.currency,
            type: toModulePricingType(definition.defaultPricing.type),
            isActive: true,
          },
        });
      }
    }),
  );
}

export function normalizePricingType(value: string) {
  return value === "one_time" ? ModulePricingType.ONE_TIME : ModulePricingType.MONTHLY;
}

export function serializePricingType(value: ModulePricingType) {
  return value === ModulePricingType.ONE_TIME ? "one_time" : "monthly";
}

export function toJsonObject(value: Record<string, unknown>) {
  return value as Prisma.InputJsonValue;
}

