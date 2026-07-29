import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createPaymentService } from "@/lib/payments/payment-service";
import { prismaPaymentRepository } from "@/lib/payments/payment-repository";
import { resolveRestStaffRequest } from "@/lib/staff/staff-request-context";

const payments = createPaymentService(prismaPaymentRepository);

export async function GET(request: Request) {
  try {
    const context = await resolveRestStaffRequest({
      authorization: request.headers.get("authorization"),
      requiredCapability: "cash:operate",
    });
    const rows = await db.payment.findMany({
      where: {
        globalTenantId: context.globalTenantId,
        branchId: context.branchId,
      },
      include: { order: { select: { orderNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json(serialize({ payments: rows }));
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
    const payload = await request.json();
    const result = await payments.apply({
      ...payload,
      globalTenantId: context.globalTenantId,
      branchId: context.branchId,
      actorId: context.actorId,
    });
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
  const code = error instanceof Error ? error.message : "REST_PAYMENT_FAILED";
  return NextResponse.json({ error: code }, {
    status: code.includes("SESSION") ? 401
      : code.includes("FORBIDDEN") ? 403
        : code.includes("NOT_FOUND") ? 404
          : code.includes("CONFLICT") || code.includes("EXCEEDS") ? 409 : 400,
  });
}

