import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { prismaDeliveryRepository } from "@/lib/delivery/delivery-repository";
import { createDeliveryService } from "@/lib/delivery/delivery-service";
import { resolveRestStaffRequest } from "@/lib/staff/staff-request-context";

const service = createDeliveryService(prismaDeliveryRepository);

async function context(request: Request) {
  return resolveRestStaffRequest({
    authorization: request.headers.get("authorization"),
    requiredCapability: "delivery:operate",
  });
}

export async function GET(request: Request) {
  try {
    const actor = await context(request);
    const orders = await db.deliveryOrder.findMany({
      where: {
        globalTenantId: actor.globalTenantId,
        branchId: actor.branchId,
      },
      include: {
        connection: { select: { provider: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({
      orders: orders.map((order) => ({
        ...order,
        total: order.total.toFixed(2),
      })),
    });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await context(request);
    const payload = z.object({
      action: z.enum(["ACCEPT", "REJECT", "UPDATE", "CANCEL"]),
    }).passthrough().parse(await request.json());
    const { action, ...operation } = payload;
    const input = {
      ...operation,
      globalTenantId: actor.globalTenantId,
      branchId: actor.branchId,
      actorId: actor.actorId,
    };
    const result = action === "ACCEPT" ? await service.accept(input)
      : action === "REJECT" ? await service.reject(input)
        : action === "UPDATE" ? await service.update(input)
          : await service.cancel(input);
    return NextResponse.json({ result });
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "REST_DELIVERY_FAILED";
  return NextResponse.json({ error: code }, {
    status: code.includes("SESSION") ? 401
      : code.includes("FORBIDDEN") ? 403
        : code.includes("NOT_FOUND") ? 404
          : code.includes("CERTIFICATION") || code.includes("INACTIVE") ? 409
            : 400,
  });
}
