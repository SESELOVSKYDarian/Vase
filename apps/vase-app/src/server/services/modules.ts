import { ModulePricingType, ModuleProduct, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { platformModules } from "@/config/modules";

function toModuleProduct(product: "BUSINESS" | "LABS" | "MANAGEMENT") {
  if (product === "MANAGEMENT") return ModuleProduct.MANAGEMENT;
  return product === "BUSINESS" ? ModuleProduct.BUSINESS : ModuleProduct.LABS;
}

function toModulePricingType(type: "monthly" | "one_time" | "yearly") {
  if (type === "yearly") return ModulePricingType.YEARLY;
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

      await Promise.all(
        definition.submodules.map(async (submoduleDefinition) => {
          const submodule = await prisma.moduleSubmodule.upsert({
            where: {
              moduleId_key: {
                moduleId: definition.id,
                key: submoduleDefinition.key,
              },
            },
            update: {
              name: submoduleDefinition.name,
              description: submoduleDefinition.description,
              route: submoduleDefinition.route,
              isActive: true,
            },
            create: {
              moduleId: definition.id,
              key: submoduleDefinition.key,
              name: submoduleDefinition.name,
              description: submoduleDefinition.description,
              route: submoduleDefinition.route,
              isActive: true,
            },
          });

          const pricingDefinitions = [
            {
              price: submoduleDefinition.pricing.development,
              type: ModulePricingType.ONE_TIME,
            },
            ...(submoduleDefinition.pricing.hostingMonthly != null
              ? [{ price: submoduleDefinition.pricing.hostingMonthly, type: ModulePricingType.MONTHLY }]
              : []),
            ...(submoduleDefinition.pricing.hostingYearly != null
              ? [{ price: submoduleDefinition.pricing.hostingYearly, type: ModulePricingType.YEARLY }]
              : []),
          ];

          await Promise.all(
            pricingDefinitions.map(async (pricingDefinition) => {
              const existing = await prisma.moduleSubmodulePricing.findFirst({
                where: {
                  submoduleId: submodule.id,
                  type: pricingDefinition.type,
                  isActive: true,
                },
                orderBy: { createdAt: "desc" },
              });

              if (existing) {
                await prisma.moduleSubmodulePricing.update({
                  where: { id: existing.id },
                  data: {
                    price: pricingDefinition.price,
                    currency: submoduleDefinition.pricing.currency,
                    isActive: true,
                  },
                });
                return;
              }

              await prisma.moduleSubmodulePricing.create({
                data: {
                  submoduleId: submodule.id,
                  price: pricingDefinition.price,
                  currency: submoduleDefinition.pricing.currency,
                  type: pricingDefinition.type,
                  isActive: true,
                },
              });
            }),
          );
        }),
      );

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

export function normalizePricingType(value: string): ModulePricingType {
  if (value === "yearly") return ModulePricingType.YEARLY;
  return value === "one_time" ? ModulePricingType.ONE_TIME : ModulePricingType.MONTHLY;
}

export function serializePricingType(value: ModulePricingType): "monthly" | "one_time" | "yearly" {
  if (value === ModulePricingType.YEARLY) return "yearly";
  return value === ModulePricingType.ONE_TIME ? "one_time" : "monthly";
}

export function toJsonObject(value: Record<string, unknown>) {
  return value as Prisma.InputJsonValue;
}

