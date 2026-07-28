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
    const context = await owner(request);
    return NextResponse.json({ categories: await getCatalog(context.globalTenantId) });
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
        const key = {
          globalTenantId: context.globalTenantId,
          productId: price.productId,
          scopeType: price.scopeType,
          scopeId: price.scopeId,
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
