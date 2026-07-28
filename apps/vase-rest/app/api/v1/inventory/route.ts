import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveRestOwnerRequest } from "@/lib/request-context";
import { createInventoryService } from "@/lib/inventory/inventory-service";
import { createAllocationService } from "@/lib/inventory/allocation-service";
import {
  prismaAllocationRepository,
  prismaInventoryRepository,
} from "@/lib/inventory/inventory-repository";

const inventory = createInventoryService(prismaInventoryRepository);
const allocations = createAllocationService(prismaAllocationRepository);

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
    const [warehouses, balances, movements, branchAllocations] = await Promise.all([
      db.warehouse.findMany({
        where: { globalTenantId: context.globalTenantId, active: true },
        include: { branches: { include: { branch: true } } },
        orderBy: { name: "asc" },
      }),
      db.inventoryBalance.findMany({
        where: { globalTenantId: context.globalTenantId },
        include: { ingredient: true, warehouse: true },
      }),
      db.inventoryMovement.findMany({
        where: { globalTenantId: context.globalTenantId },
        orderBy: { occurredAt: "desc" },
        take: 100,
      }),
      db.branchInventoryAllocation.findMany({
        where: { globalTenantId: context.globalTenantId },
        include: { branch: true, ingredient: true, warehouse: true },
      }),
    ]);
    return NextResponse.json(JSON.parse(JSON.stringify({
      warehouses, balances, movements, allocations: branchAllocations,
    }, (_key, value) => typeof value === "object" && value &&
      typeof value.toFixed === "function" ? value.toFixed() : value)));
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await owner(request);
    const { action, ...payload } = await request.json();
    let result: unknown;
    if (action === "RECORD_MOVEMENT") {
      result = await inventory.record({
        ...payload,
        globalTenantId: context.globalTenantId,
        actorId: context.actor.id,
      });
    } else if (action === "REVERSE_MOVEMENT") {
      result = await inventory.reverse({
        ...payload,
        globalTenantId: context.globalTenantId,
        actorId: context.actor.id,
      });
    } else if (action === "RESERVE_OFFLINE") {
      result = await allocations.reserve({
        ...payload,
        globalTenantId: context.globalTenantId,
      });
    } else if (action === "CREATE_WAREHOUSE") {
      const input = z.object({
        code: z.string().trim().min(2).max(30).transform((v) => v.toUpperCase()),
        name: z.string().trim().min(2).max(120),
        branchIds: z.array(z.string().min(1)).min(1),
      }).parse(payload);
      result = await db.$transaction(async (tx) => {
        const tenant = await tx.restTenant.findUniqueOrThrow({
          where: { globalTenantId: context.globalTenantId },
        });
        const branches = await tx.branch.count({
          where: { globalTenantId: context.globalTenantId, id: { in: input.branchIds } },
        });
        if (branches !== new Set(input.branchIds).size) {
          throw new Error("REST_WAREHOUSE_BRANCH_FORBIDDEN");
        }
        return tx.warehouse.create({
          data: {
            restTenantId: tenant.id,
            globalTenantId: context.globalTenantId,
            code: input.code,
            name: input.name,
            branches: {
              create: [...new Set(input.branchIds)].map((branchId) => ({
                globalTenantId: context.globalTenantId,
                branchId,
              })),
            },
          },
        });
      });
    } else if (action === "CREATE_INGREDIENT") {
      const input = z.object({
        sku: z.string().trim().min(2).max(40).transform((v) => v.toUpperCase()),
        name: z.string().trim().min(2).max(120),
        baseUnit: z.enum(["UNIT", "G", "KG", "ML", "L"]),
      }).parse(payload);
      const tenant = await db.restTenant.findUniqueOrThrow({
        where: { globalTenantId: context.globalTenantId },
      });
      result = await db.ingredient.create({
        data: { restTenantId: tenant.id, globalTenantId: context.globalTenantId, ...input },
      });
    } else if (action === "SET_ALLOCATION") {
      const input = z.object({
        branchId: z.string().min(1),
        warehouseId: z.string().min(1),
        ingredientId: z.string().min(1),
        available: z.string().regex(/^\d+(?:\.\d{1,6})?$/),
        safetyStock: z.string().regex(/^\d+(?:\.\d{1,6})?$/),
      }).parse(payload);
      result = await db.$transaction(async (tx) => {
        const [branch, warehouse, ingredient] = await Promise.all([
          tx.branch.findFirst({ where: { id: input.branchId, globalTenantId: context.globalTenantId } }),
          tx.warehouse.findFirst({
            where: {
              id: input.warehouseId,
              globalTenantId: context.globalTenantId,
              branches: { some: { branchId: input.branchId } },
            },
          }),
          tx.ingredient.findFirst({ where: { id: input.ingredientId, globalTenantId: context.globalTenantId } }),
        ]);
        if (!branch || !warehouse || !ingredient) {
          throw new Error("REST_ALLOCATION_TARGET_FORBIDDEN");
        }
        return tx.branchInventoryAllocation.upsert({
          where: { branchId_ingredientId: {
            branchId: input.branchId,
            ingredientId: input.ingredientId,
          } },
          create: { globalTenantId: context.globalTenantId, ...input },
          update: {
            warehouseId: input.warehouseId,
            available: input.available,
            safetyStock: input.safetyStock,
            revision: { increment: 1 },
          },
        });
      });
    } else {
      throw new Error("REST_INVENTORY_ACTION_INVALID");
    }
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "REST_INVENTORY_FAILED";
  return NextResponse.json({ error: code }, {
    status: code.includes("SESSION") ? 401
      : code.includes("FORBIDDEN") ? 403
        : code.includes("NOT_FOUND") ? 404
          : code.includes("CONFLICT") ? 409 : 400,
  });
}
