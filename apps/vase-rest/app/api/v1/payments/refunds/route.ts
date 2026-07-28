import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { prismaRefundRepository } from "@/lib/payments/refund-repository";
import { createRefundService } from "@/lib/payments/refund-service";
import { resolveRestStaffRequest } from "@/lib/staff/staff-request-context";

const service = createRefundService(prismaRefundRepository);

export async function GET(request: Request) {
  try {
    const context = await resolveRestStaffRequest({
      authorization: request.headers.get("authorization"),
      requiredCapability: "cash:operate",
    });
    const refunds = await db.paymentRefund.findMany({
      where: {
        globalTenantId: context.globalTenantId,
        branchId: context.branchId,
      },
      include: { payment: { select: { orderId: true, tenderType: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({
      refunds: refunds.map((refund) => ({
        ...refund,
        amount: refund.amount.toFixed(2),
      })),
    });
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
    const result = await service.refund({
      ...await request.json(),
      globalTenantId: context.globalTenantId,
      branchId: context.branchId,
      actorId: context.actorId,
    });
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown) {
  const code = error instanceof Error ? error.message : "REST_REFUND_FAILED";
  return NextResponse.json({ error: code }, {
    status: code.includes("SESSION") ? 401
      : code.includes("FORBIDDEN") ? 403
        : code.includes("NOT_FOUND") ? 404
          : code.includes("CONFLICT") || code.includes("EXCEEDS") ||
              code.includes("MISMATCH") || code.includes("AMBIGUOUS") ? 409 : 400,
  });
}
