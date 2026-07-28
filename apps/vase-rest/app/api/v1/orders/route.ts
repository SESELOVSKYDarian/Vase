import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createOrderService } from "@/lib/orders/order-service";
import { prismaOrderRepository } from "@/lib/orders/order-repository";
import { resolveRestStaffRequest } from "@/lib/staff/staff-request-context";

const orders = createOrderService(prismaOrderRepository);

async function actor(request: Request) {
  return resolveRestStaffRequest({
    authorization: request.headers.get("authorization"),
    requiredCapability: "orders:write",
  });
}

export async function GET(request: Request) {
  try {
    const context = await actor(request);
    const orderId = new URL(request.url).searchParams.get("orderId");
    if (orderId) {
      const order = await db.restaurantOrder.findFirst({
        where: {
          id: orderId,
          globalTenantId: context.globalTenantId,
          branchId: context.branchId,
        },
        include: {
          table: true,
          items: { include: { modifiers: true, kitchenTicket: true } },
        },
      });
      if (!order) throw new Error("REST_ORDER_NOT_FOUND");
      return NextResponse.json(serialize({ order }));
    }
    const rows = await db.restaurantOrder.findMany({
      where: {
        globalTenantId: context.globalTenantId,
        branchId: context.branchId,
        status: { in: ["OPEN", "SUBMITTED", "PARTIALLY_READY", "READY"] },
      },
      include: { table: true, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(serialize({ orders: rows }));
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const context = await actor(request);
    const { action, ...payload } = await request.json();
    const common = {
      ...payload,
      globalTenantId: context.globalTenantId,
      branchId: context.branchId,
      actorId: context.actorId,
    };
    const result = action === "OPEN" ? await orders.open(common)
      : action === "ADD_ITEM" ? await orders.addItem(common)
        : action === "SUBMIT" ? await orders.submit(common)
          : action === "CANCEL" ? await orders.cancel(common)
            : action === "SPLIT" ? await orders.split(common)
              : action === "MERGE" ? await orders.merge(common)
                : (() => { throw new Error("REST_ORDER_ACTION_INVALID"); })();
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
  const code = error instanceof Error ? error.message : "REST_ORDER_FAILED";
  return NextResponse.json({ error: code }, {
    status: code.includes("SESSION") ? 401
      : code.includes("FORBIDDEN") ? 403
        : code.includes("NOT_FOUND") ? 404
          : code.includes("CONFLICT") || code.includes("REVISION") ? 409 : 400,
  });
}
