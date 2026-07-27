import { NextResponse } from "next/server";
import { operateOrder } from "../../../../../lib/order-operation-runtime";
import type { OrderOperationalStatus } from "../../../../../lib/order-operations";
import { resolveLabsRequestContext } from "../../../../../lib/request-context";

const statuses = new Set<OrderOperationalStatus>(["PROCESSING", "PREPARING", "READY", "CANCELLED"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const { orderId } = await params;
    const { context } = await resolveLabsRequestContext(request.headers.get("cookie"));
    const body = await request.json().catch(() => ({}));
    const status = typeof body.status === "string" ? body.status.toUpperCase() as OrderOperationalStatus : null;
    if (!status || !statuses.has(status)) {
      return NextResponse.json({ error: "ORDER_STATUS_INVALID" }, { status: 400 });
    }
    const result = await operateOrder({
      globalTenantId: context.globalTenantId,
      orderId,
      status,
      retryNotification: body.retryNotification === true,
    });
    return NextResponse.json({ ok: true, order: result });
  } catch (error) {
    const code = error instanceof Error ? error.message : "ORDER_OPERATION_FAILED";
    const status = code === "ORDER_NOT_FOUND" ? 404 : code.startsWith("LABS_SESSION") ? 401 : 500;
    return NextResponse.json({ error: code }, { status });
  }
}
