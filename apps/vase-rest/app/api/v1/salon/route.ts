import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveRestOwnerRequest } from "@/lib/request-context";
import { resolveRestStaffRequest } from "@/lib/staff/staff-request-context";
import { createTableService } from "@/lib/salon/table-service";
import { prismaTableRepository } from "@/lib/salon/salon-repository";

const tables = createTableService(prismaTableRepository);

async function actor(request: Request) {
  if (request.headers.get("authorization")) {
    return resolveRestStaffRequest({
      authorization: request.headers.get("authorization"),
      requiredCapability: "tables:write",
    });
  }
  const url = new URL(request.url);
  const context = await resolveRestOwnerRequest({
    cookieHeader: request.headers.get("cookie"),
    requestedTenantSlug: url.searchParams.get("tenant") ?? undefined,
  });
  const branchId = url.searchParams.get("branchId");
  if (!branchId || !await db.branch.findFirst({
    where: { id: branchId, globalTenantId: context.globalTenantId },
  })) throw new Error("REST_TABLE_BRANCH_FORBIDDEN");
  return {
    globalTenantId: context.globalTenantId,
    branchId,
    actorId: context.actor.id,
    role: "OWNER" as const,
  };
}

export async function GET(request: Request) {
  try {
    const context = await actor(request);
    const floors = await db.diningFloor.findMany({
      where: {
        globalTenantId: context.globalTenantId,
        branchId: context.branchId,
        active: true,
      },
      orderBy: { sortOrder: "asc" },
      include: {
        zones: true,
        tables: { orderBy: { code: "asc" } },
      },
    });
    return NextResponse.json(JSON.parse(JSON.stringify({ floors }, (_key, value) =>
      typeof value === "object" && value &&
      typeof value.toFixed === "function" ? value.toFixed() : value)));
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await actor(request);
    const { action, ...payload } = await request.json();
    let result: unknown;
    if (action === "CREATE_FLOOR") {
      if (context.role !== "OWNER") throw new Error("REST_STAFF_CAPABILITY_FORBIDDEN");
      const input = z.object({
        code: z.string().min(1).max(20).transform((v) => v.toUpperCase()),
        name: z.string().min(1).max(80),
        sortOrder: z.number().int().nonnegative().default(0),
      }).parse(payload);
      const tenant = await db.restTenant.findUniqueOrThrow({
        where: { globalTenantId: context.globalTenantId },
      });
      result = await db.diningFloor.create({
        data: {
          restTenantId: tenant.id,
          globalTenantId: context.globalTenantId,
          branchId: context.branchId,
          ...input,
        },
      });
    } else if (action === "CREATE_TABLE") {
      result = await tables.create({
        ...payload,
        globalTenantId: context.globalTenantId,
        branchId: context.branchId,
      });
    } else if (action === "TRANSITION") {
      result = await tables.transition({
        ...payload,
        globalTenantId: context.globalTenantId,
        branchId: context.branchId,
        actorId: context.actorId,
      });
    } else if (action === "MERGE") {
      result = await tables.merge({
        ...payload,
        globalTenantId: context.globalTenantId,
        branchId: context.branchId,
        actorId: context.actorId,
      });
    } else if (action === "SPLIT") {
      result = await tables.split({
        ...payload,
        globalTenantId: context.globalTenantId,
        branchId: context.branchId,
        actorId: context.actorId,
      });
    } else {
      throw new Error("REST_SALON_ACTION_INVALID");
    }
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "REST_SALON_FAILED";
  return NextResponse.json({ error: code }, {
    status: code.includes("SESSION") ? 401
      : code.includes("FORBIDDEN") ? 403
        : code.includes("NOT_FOUND") ? 404
          : code.includes("CONFLICT") ? 409 : 400,
  });
}
