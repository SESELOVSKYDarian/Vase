import { NextResponse } from "next/server";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { receiptNumber, renderReceiptPdf } from "@/lib/billing/receipt-pdf";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

/** Comprobante de un cobro, para el Admin (ficha del cliente y Finanzas). */
export async function GET(_request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  try {
    await requireAdminPermission(adminPermissions.BILLING);
  } catch {
    return new NextResponse(null, { status: 404 });
  }
  const { paymentId } = await params;
  if (!paymentId || paymentId.length > 64) return new NextResponse(null, { status: 404 });

  const payment = await prisma.clientPayment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      tenantId: true,
      concept: true,
      totalAmount: true,
      paidAmount: true,
      paidAt: true,
      method: true,
      tenant: { select: { name: true, billingEmail: true } },
      partialItems: { orderBy: { paidAt: "asc" }, select: { amount: true, paidAt: true, method: true, note: true } },
    },
  });
  if (!payment || Number(payment.paidAmount) <= 0) return new NextResponse(null, { status: 404 });
  const profile = await prisma.tenantBillingProfile.findUnique({ where: { tenantId: payment.tenantId }, select: { legalName: true, taxId: true } });

  const items = payment.partialItems.length
    ? payment.partialItems.map((item) => ({
        paidAt: item.paidAt ?? payment.paidAt ?? new Date(),
        method: item.method,
        reference: item.note?.replace(/^Mercado Pago (\d+)$/, "Operación $1") ?? null,
        amount: Number(item.amount),
      }))
    : [{ paidAt: payment.paidAt ?? new Date(), method: payment.method, reference: null, amount: Number(payment.paidAmount) }];

  const pdf = renderReceiptPdf({
    paymentId: payment.id,
    concept: payment.concept,
    total: Number(payment.totalAmount),
    paid: Number(payment.paidAmount),
    issuedAt: payment.paidAt ?? items[items.length - 1].paidAt,
    customer: { name: payment.tenant.name, legalName: profile?.legalName, taxId: profile?.taxId, email: payment.tenant.billingEmail },
    items,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Comprobante ${receiptNumber(payment.id)}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
