import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveRestOwnerRequest } from "@/lib/request-context";
import { createCatalogService } from "@/lib/catalog/catalog-service";
import {
  getCatalog,
  prismaCatalogRepository,
  prismaRecipeRepository,
} from "@/lib/catalog/catalog-repository";
import { createRecipeService } from "@/lib/catalog/recipe-service";
import { db } from "@/lib/db";
import { resolveRestStaffRequest } from "@/lib/staff/staff-request-context";

const catalog = createCatalogService(prismaCatalogRepository);
const recipes = createRecipeService(prismaRecipeRepository);

async function owner(request: Request) {
  const tenant = new URL(request.url).searchParams.get("tenant") ?? undefined;
  return resolveRestOwnerRequest({
    cookieHeader: request.headers.get("cookie"),
    requestedTenantSlug: tenant,
  });
}

export async function GET(request: Request) {
  try {
    const globalTenantId = request.headers.get("authorization")
      ? (await resolveRestStaffRequest({
        authorization: request.headers.get("authorization"),
        requiredCapability: "orders:write",
      })).globalTenantId
      : (await owner(request)).globalTenantId;
    const [categories, ingredients, branches, branchGroups, modifierGroups] =
      await Promise.all([
        getCatalog(globalTenantId),
        db.ingredient.findMany({
          where: { globalTenantId, active: true },
          orderBy: { name: "asc" },
        }),
        db.branch.findMany({
          where: { globalTenantId, active: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        db.branchGroup.findMany({
          where: { globalTenantId },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
        db.modifierGroup.findMany({
          where: { globalTenantId },
          include: { options: { orderBy: { name: "asc" } } },
          orderBy: { name: "asc" },
        }),
      ]);
    return NextResponse.json(JSON.parse(JSON.stringify({
      categories,
      ingredients,
      branches,
      branchGroups,
      modifierGroups,
    }, (_key, item) =>
      typeof item === "object" && item && typeof item.toFixed === "function"
        ? item.toFixed() : item)));
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await owner(request);
    const { action, ...payload } = await request.json();
    let result: unknown;
    if (action === "CREATE_CATEGORY") {
      result = await catalog.createCategory(context.globalTenantId, payload);
    } else if (action === "CREATE_PRODUCT") {
      result = await catalog.createProduct(context.globalTenantId, payload);
    } else if (action === "UPDATE_PRODUCT") {
      const { productId, ...changes } = payload;
      result = await catalog.updateProduct(context.globalTenantId, productId, changes);
    } else if (action === "REPLACE_RECIPE") {
      result = await recipes.replace({ ...payload, globalTenantId: context.globalTenantId });
    } else if (action === "SET_PRICE") {
      const price = z.object({
        productId: z.string().min(1),
        scopeType: z.enum(["TENANT", "BRANCH_GROUP", "BRANCH"]),
        scopeId: z.string().min(1),
        amount: z.string().regex(/^(?:0|[1-9]\d*)\.\d{2}$/),
        currency: z.string().length(3).default("ARS"),
        expectedRevision: z.number().int().nonnegative(),
      }).parse(payload);
      result = await db.$transaction(async (tx) => {
        const normalizedScopeId = price.scopeType === "TENANT"
          ? context.globalTenantId : price.scopeId;
        const product = await tx.menuProduct.findFirst({
          where: { id: price.productId, globalTenantId: context.globalTenantId },
          select: { id: true },
        });
        const validScope = price.scopeType === "TENANT"
          ? normalizedScopeId === context.globalTenantId
          : price.scopeType === "BRANCH"
            ? Boolean(await tx.branch.findFirst({
              where: { id: normalizedScopeId, globalTenantId: context.globalTenantId },
              select: { id: true },
            }))
            : Boolean(await tx.branchGroup.findFirst({
              where: { id: normalizedScopeId, globalTenantId: context.globalTenantId },
              select: { id: true },
            }));
        if (!product || !validScope) throw new Error("REST_PRICE_SCOPE_FORBIDDEN");
        const key = {
          globalTenantId: context.globalTenantId,
          productId: price.productId,
          scopeType: price.scopeType,
          scopeId: normalizedScopeId,
        };
        if (price.expectedRevision === 0) {
          return tx.productPrice.create({
            data: {
              ...key,
              amount: price.amount,
              currency: price.currency.toUpperCase(),
            },
          });
        }
        const changed = await tx.productPrice.updateMany({
          where: { ...key, revision: price.expectedRevision },
          data: {
            amount: price.amount,
            currency: price.currency.toUpperCase(),
            revision: { increment: 1 },
          },
        });
        if (changed.count !== 1) throw new Error("REST_PRICE_REVISION_CONFLICT");
        return tx.productPrice.findUniqueOrThrow({
          where: { globalTenantId_productId_scopeType_scopeId: key },
        });
      });
    } else if (action === "SET_BRANCH_AVAILABILITY") {
      const input = z.object({
        productId: z.string().min(1),
        branchId: z.string().min(1),
        available: z.boolean(),
        expectedRevision: z.number().int().nonnegative(),
      }).strict().parse(payload);
      result = await db.$transaction(async (tx) => {
        const [product, branch] = await Promise.all([
          tx.menuProduct.findFirst({
            where: { id: input.productId, globalTenantId: context.globalTenantId },
            select: { id: true },
          }),
          tx.branch.findFirst({
            where: { id: input.branchId, globalTenantId: context.globalTenantId },
            select: { id: true },
          }),
        ]);
        if (!product || !branch) throw new Error("REST_CATALOG_SCOPE_FORBIDDEN");
        if (input.expectedRevision === 0) {
          return tx.productBranchAvailability.create({
            data: {
              globalTenantId: context.globalTenantId,
              productId: input.productId,
              branchId: input.branchId,
              available: input.available,
            },
          });
        }
        const changed = await tx.productBranchAvailability.updateMany({
          where: {
            productId: input.productId,
            branchId: input.branchId,
            revision: input.expectedRevision,
          },
          data: { available: input.available, revision: { increment: 1 } },
        });
        if (changed.count !== 1) throw new Error("REST_CATALOG_REVISION_CONFLICT");
        return changed;
      });
    } else if (action === "CREATE_MODIFIER_GROUP") {
      const input = z.object({
        code: z.string().trim().min(2).max(30).transform((value) => value.toUpperCase()),
        name: z.string().trim().min(2).max(100),
        minSelections: z.number().int().nonnegative(),
        maxSelections: z.number().int().positive(),
      }).strict().refine((value) => value.maxSelections >= value.minSelections)
        .parse(payload);
      const tenant = await db.restTenant.findUniqueOrThrow({
        where: { globalTenantId: context.globalTenantId },
        select: { id: true },
      });
      result = await db.modifierGroup.create({
        data: {
          restTenantId: tenant.id,
          globalTenantId: context.globalTenantId,
          ...input,
        },
      });
    } else if (action === "CREATE_MODIFIER_OPTION") {
      const input = z.object({
        modifierGroupId: z.string().min(1),
        code: z.string().trim().min(1).max(30).transform((value) => value.toUpperCase()),
        name: z.string().trim().min(1).max(100),
        priceDelta: z.string().regex(/^-?(?:0|[1-9]\d*)\.\d{2}$/),
      }).strict().parse(payload);
      const group = await db.modifierGroup.findFirst({
        where: { id: input.modifierGroupId, globalTenantId: context.globalTenantId },
        select: { id: true },
      });
      if (!group) throw new Error("REST_MODIFIER_GROUP_NOT_FOUND");
      result = await db.modifierOption.create({
        data: { globalTenantId: context.globalTenantId, ...input },
      });
    } else if (action === "LINK_MODIFIER_GROUP") {
      const input = z.object({
        productId: z.string().min(1),
        modifierGroupId: z.string().min(1),
        sortOrder: z.number().int().nonnegative().default(0),
      }).strict().parse(payload);
      const [product, group] = await Promise.all([
        db.menuProduct.findFirst({
          where: { id: input.productId, globalTenantId: context.globalTenantId },
          select: { id: true },
        }),
        db.modifierGroup.findFirst({
          where: { id: input.modifierGroupId, globalTenantId: context.globalTenantId },
          select: { id: true },
        }),
      ]);
      if (!product || !group) throw new Error("REST_MODIFIER_SCOPE_FORBIDDEN");
      result = await db.productModifierGroup.upsert({
        where: {
          productId_modifierGroupId: {
            productId: input.productId,
            modifierGroupId: input.modifierGroupId,
          },
        },
        create: { globalTenantId: context.globalTenantId, ...input },
        update: { sortOrder: input.sortOrder },
      });
    } else {
      throw new Error("REST_CATALOG_ACTION_INVALID");
    }
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "REST_CATALOG_FAILED";
  return NextResponse.json({ error: code }, {
    status: code.includes("SESSION") ? 401
      : code.includes("NOT_FOUND") ? 404
        : code.includes("CONFLICT") ? 409 : 400,
  });
}
