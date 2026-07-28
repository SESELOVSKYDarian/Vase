import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  buildReconciliation,
  reconciliationCsv,
} from "@/lib/payments/reconciliation-service";
import { resolveRestStaffRequest } from "@/lib/staff/staff-request-context";

export async function GET(request: Request) {
  try {
    const context = await resolveRestStaffRequest({
      authorization: request.headers.get("authorization"),
      requiredCapability: "cash:operate",
    });
    const url = new URL(request.url);
    const to = url.searchParams.get("to")
      ? new Date(`${url.searchParams.get("to")}T23:59:59.999Z`) : new Date();
    const from = url.searchParams.get("from")
      ? new Date(`${url.searchParams.get("from")}T00:00:00.000Z`)
      : new Date(to.getTime() - 30 * 24 * 60 * 60_000);
    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      from > to ||
      to.getTime() - from.getTime() > 366 * 24 * 60 * 60_000
    ) throw new Error("REST_RECONCILIATION_RANGE_INVALID");
    const [orders, payments, attempts, documents, refunds, fiscalConnection] =
      await Promise.all([
        db.restaurantOrder.findMany({
          where: {
            globalTenantId: context.globalTenantId,
            branchId: context.branchId,
            createdAt: { gte: from, lte: to },
          },
          select: { id: true, status: true, total: true },
        }),
        db.payment.findMany({
          where: {
            globalTenantId: context.globalTenantId,
            branchId: context.branchId,
            createdAt: { gte: from, lte: to },
          },
          select: {
            id: true,
            orderId: true,
            status: true,
            provider: true,
            reference: true,
            amount: true,
          },
        }),
        db.providerPaymentAttempt.findMany({
          where: {
            globalTenantId: context.globalTenantId,
            branchId: context.branchId,
            createdAt: { gte: from, lte: to },
          },
          select: {
            orderId: true,
            status: true,
            providerPaymentId: true,
          },
        }),
        db.fiscalDocument.findMany({
          where: {
            globalTenantId: context.globalTenantId,
            branchId: context.branchId,
            createdAt: { gte: from, lte: to },
          },
          select: { orderId: true, status: true },
        }),
        db.paymentRefund.findMany({
          where: {
            globalTenantId: context.globalTenantId,
            branchId: context.branchId,
            createdAt: { gte: from, lte: to },
          },
          select: {
            id: true,
            paymentId: true,
            status: true,
            amount: true,
          },
        }),
        db.fiscalConnection.findFirst({
          where: {
            globalTenantId: context.globalTenantId,
            branchId: context.branchId,
            status: { in: ["SANDBOX", "ACTIVE"] },
          },
          select: { id: true },
        }),
      ]);
    const result = buildReconciliation({
      fiscalConfigured: Boolean(fiscalConnection),
      orders: orders.map((item) => ({ ...item, total: item.total.toFixed(2) })),
      payments: payments.map((item) => ({
        ...item,
        amount: item.amount.toFixed(2),
      })),
      attempts,
      fiscalDocuments: documents,
      refunds: refunds.map((item) => ({
        ...item,
        amount: item.amount.toFixed(2),
      })),
    });
    if (url.searchParams.get("format") === "csv") {
      return new NextResponse(reconciliationCsv(result.discrepancies), {
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": 'attachment; filename="vase-rest-conciliacion.csv"',
        },
      });
    }
    return NextResponse.json({ ...result, from, to });
  } catch (error) {
    const code = error instanceof Error
      ? error.message : "REST_RECONCILIATION_FAILED";
    return NextResponse.json({ error: code }, {
      status: code.includes("SESSION") ? 401
        : code.includes("FORBIDDEN") ? 403 : 400,
    });
  }
}
