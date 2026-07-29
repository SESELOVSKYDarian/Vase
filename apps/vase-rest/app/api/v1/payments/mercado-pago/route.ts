import { NextResponse } from "next/server";
import { createMercadoPagoPaymentService } from "@/lib/payments/mercado-pago-service";
import { prismaMercadoPagoOperationalRepository } from "@/lib/payments/mercado-pago-repository";
import { resolveRestStaffRequest } from "@/lib/staff/staff-request-context";

const service = createMercadoPagoPaymentService(
  prismaMercadoPagoOperationalRepository,
);

export async function POST(request: Request) {
  try {
    const context = await resolveRestStaffRequest({
      authorization: request.headers.get("authorization"),
      requiredCapability: "cash:operate",
    });
    const payload = await request.json();
    const result = await service.create({
      ...payload,
      globalTenantId: context.globalTenantId,
      branchId: context.branchId,
      actorId: context.actorId,
    });
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "REST_MP_PAYMENT_FAILED";
    return NextResponse.json({ error: code }, {
      status: code.includes("SESSION") ? 401
        : code.includes("FORBIDDEN") ? 403
          : code.includes("AMBIGUOUS") || code.includes("CONFLICT") ? 409 : 400,
    });
  }
}

