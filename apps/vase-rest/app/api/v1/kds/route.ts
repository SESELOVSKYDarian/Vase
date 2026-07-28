import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createKitchenService } from "@/lib/kds/kitchen-service";
import { prismaKitchenRepository } from "@/lib/orders/order-repository";
import { resolveRestStaffRequest } from "@/lib/staff/staff-request-context";
import { resolveRestOwnerRequest } from "@/lib/request-context";
import { z } from "zod";

const kitchen = createKitchenService(prismaKitchenRepository);

export async function GET(request: Request) {
  try {
    const context = await resolveRestStaffRequest({
      authorization: request.headers.get("authorization"),
      requiredCapability: "kds:operate",
    });
    const stationId = new URL(request.url).searchParams.get("stationId");
    const tickets = await db.kitchenTicket.findMany({
      where: {
        globalTenantId: context.globalTenantId,
        branchId: context.branchId,
        ...(stationId ? { stationId } : {}),
        status: { in: ["QUEUED", "PREPARING", "READY"] },
      },
      include: {
        station: true,
        order: { select: { orderNumber: true, table: { select: { code: true } } } },
        orderItem: { include: { modifiers: true } },
      },
      orderBy: [{ status: "desc" }, { queuedAt: "asc" }],
    });
    return NextResponse.json({ tickets });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    if (payload.action === "CREATE_STATION") {
      const url = new URL(request.url);
      const owner = await resolveRestOwnerRequest({
        cookieHeader: request.headers.get("cookie"),
        requestedTenantSlug: url.searchParams.get("tenant") ?? undefined,
      });
      const input = z.object({
        branchId: z.string().min(1),
        code: z.string().min(1).max(20).transform((v) => v.toUpperCase()),
        name: z.string().min(2).max(100),
        categoryIds: z.array(z.string().min(1)).min(1),
      }).parse(payload);
      const [tenant, branch, categoryCount] = await Promise.all([
        db.restTenant.findUniqueOrThrow({ where: { globalTenantId: owner.globalTenantId } }),
        db.branch.findFirst({ where: { id: input.branchId, globalTenantId: owner.globalTenantId } }),
        db.menuCategory.count({
          where: { id: { in: input.categoryIds }, globalTenantId: owner.globalTenantId },
        }),
      ]);
      if (!branch || categoryCount !== new Set(input.categoryIds).size) {
        throw new Error("REST_KITCHEN_STATION_SCOPE_FORBIDDEN");
      }
      const station = await db.kitchenStation.create({
        data: {
          restTenantId: tenant.id,
          globalTenantId: owner.globalTenantId,
          branchId: input.branchId,
          code: input.code,
          name: input.name,
          categories: {
            create: [...new Set(input.categoryIds)].map((categoryId) => ({
              globalTenantId: owner.globalTenantId,
              categoryId,
            })),
          },
        },
      });
      return NextResponse.json({ result: station }, { status: 201 });
    }
    const context = await resolveRestStaffRequest({
      authorization: request.headers.get("authorization"),
      requiredCapability: "kds:operate",
    });
    const result = await kitchen.transition({
      ...payload,
      globalTenantId: context.globalTenantId,
      branchId: context.branchId,
      actorId: context.actorId,
    });
    return NextResponse.json({ result });
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "REST_KDS_FAILED";
  return NextResponse.json({ error: code }, {
    status: code.includes("SESSION") ? 401
      : code.includes("FORBIDDEN") ? 403
        : code.includes("NOT_FOUND") ? 404
          : code.includes("CONFLICT") || code.includes("REVISION") ? 409 : 400,
  });
}
