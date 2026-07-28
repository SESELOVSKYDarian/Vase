import type { Prisma } from "@prisma/client";
import { db } from "../db";
import type { CatalogRepository } from "./catalog-service";

export const prismaCatalogRepository: CatalogRepository = {
  createCategory(input) {
    return db.$transaction(async (tx) => {
      const tenant = await tx.restTenant.findUniqueOrThrow({
        where: { globalTenantId: input.globalTenantId },
      });
      return tx.menuCategory.create({
        data: { restTenantId: tenant.id, ...input },
      });
    });
  },
  createProduct(input) {
    return db.$transaction(async (tx) => {
      const tenant = await tx.restTenant.findUniqueOrThrow({
        where: { globalTenantId: input.globalTenantId },
      });
      const category = await tx.menuCategory.findFirst({
        where: { id: input.categoryId, globalTenantId: input.globalTenantId },
      });
      if (!category) throw new Error("REST_CATEGORY_NOT_FOUND");
      return tx.menuProduct.create({
        data: { restTenantId: tenant.id, ...input },
      });
    });
  },
  findProduct(globalTenantId, productId) {
    return db.menuProduct.findFirst({
      where: { id: productId, globalTenantId },
      select: { id: true, globalTenantId: true, sku: true, revision: true },
    });
  },
  updateProduct(input) {
    return db.$transaction(async (tx) => {
      const changed = await tx.menuProduct.updateMany({
        where: {
          id: input.productId,
          globalTenantId: input.globalTenantId,
          revision: input.expectedRevision,
        },
        data: {
          categoryId: input.categoryId,
          name: input.name,
          description: input.description,
          available: input.available,
          revision: { increment: 1 },
        },
      });
      if (changed.count !== 1) throw new Error("REST_CATALOG_REVISION_CONFLICT");
      return tx.menuProduct.findUniqueOrThrow({ where: { id: input.productId } });
    });
  },
};

export const prismaRecipeRepository = {
  replace(input: {
    globalTenantId: string;
    productId: string;
    expectedRevision: number;
    items: Array<{ ingredientId: string; quantity: string; unit: string }>;
  }) {
    return db.$transaction(async (tx) => {
      const product = await tx.menuProduct.findFirst({
        where: {
          id: input.productId,
          globalTenantId: input.globalTenantId,
          revision: input.expectedRevision,
        },
      });
      if (!product) throw new Error("REST_CATALOG_REVISION_CONFLICT");
      const ingredientIds = [...new Set(input.items.map((item) => item.ingredientId))];
      if (await tx.ingredient.count({
        where: { globalTenantId: input.globalTenantId, id: { in: ingredientIds }, active: true },
      }) !== ingredientIds.length) {
        throw new Error("REST_INGREDIENT_NOT_FOUND");
      }
      await tx.recipeItem.deleteMany({ where: { productId: input.productId } });
      await tx.recipeItem.createMany({
        data: input.items.map((item) => ({
          globalTenantId: input.globalTenantId,
          productId: input.productId,
          ingredientId: item.ingredientId,
          quantity: item.quantity,
          unit: item.unit,
        })),
      });
      const updated = await tx.menuProduct.update({
        where: { id: input.productId },
        data: { revision: { increment: 1 } },
        include: { recipeItems: true },
      });
      return {
        ...updated,
        recipeItems: updated.recipeItems.map((item) => ({
          ...item,
          quantity: item.quantity.toFixed(),
        })),
      };
    });
  },
};

export async function getCatalog(globalTenantId: string) {
  return db.menuCategory.findMany({
    where: { globalTenantId, active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      products: {
        orderBy: { name: "asc" },
        include: {
          recipeItems: true,
          prices: true,
          branchAvailability: true,
          modifierGroups: {
            include: { modifierGroup: { include: { options: true } } },
          },
        },
      },
    },
  }).then((categories) => JSON.parse(JSON.stringify(categories, (_key, value) =>
    typeof value === "object" && value && "toFixed" in value &&
    typeof value.toFixed === "function" ? value.toFixed() : value,
  )) as Prisma.JsonValue);
}
