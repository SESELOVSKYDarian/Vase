import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createCashService } from "@/lib/cash/cash-service";
import { prismaCashRepository } from "@/lib/cash/cash-repository";
import { resolveRestStaffRequest } from "@/lib/staff/staff-request-context";

const cash = createCashService(prismaCashRepository);

export async function GET(request: Request) {
  try {
    const context = await resolveRestStaffRequest({
      authorization: request.headers.get("authorization"),
      requiredCapability: "cash:operate",
    });
    const drawers = await db.cashDrawer.findMany({
      where: {
        globalTenantId: context.globalTenantId,
        branchId: context.branchId,
      },
      include: {
        movements: { orderBy: { occurredAt: "desc" }, take: 100 },
      },
      orderBy: { openedAt: "desc" },
      take: 30,
    });
    return NextResponse.json(serialize({ drawers }));
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await resolveRestStaffRequest({
      authorization: request.headers.get("authorization"),
      requiredCapability: "cash:operate",
    });
    const { action, ...payload } = await request.json();
    const input = {
      ...payload,
      globalTenantId: context.globalTenantId,
      branchId: context.branchId,
      actorId: context.actorId,
    };
    const result = action === "OPEN" ? await cash.open(input)
      : action === "MOVEMENT" ? await cash.movement(input)
        : action === "CLOSE" ? await cash.close(input)
          : (() => { throw new Error("REST_CASH_ACTION_INVALID"); })();
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}

function serialize(value: unknown) {
  return JSON.parse(JSON.stringify(value, (_key, item) =>
    typeof item === "object" && item && typeof item.toFixed === "function"
      ? item.toFixed(2) : item));
}

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "REST_CASH_FAILED";
  return NextResponse.json({ error: code }, {
    status: code.includes("SESSION") ? 401
      : code.includes("FORBIDDEN") ? 403
        : code.includes("NOT_FOUND") ? 404
          : code.includes("CONFLICT") || code.includes("ALREADY") ? 409 : 400,
  });
}

