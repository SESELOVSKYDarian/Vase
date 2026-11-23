import { NextResponse } from "next/server";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import { receiptNumber, renderReceiptPdf } from "@/lib/billing/receipt-pdf";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

/** Comprobante de pago en PDF de una factura de la cuenta (no es una factura). Solo el dueño de la cuenta. */
export async function GET(_request: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  let membership;
  try {
    ({ membership } = await requireTenantRole(tenantRoles.OWNER));
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  const { paymentId } = await params;
  if (!paymentId || paymentId.length > 64) return new NextResponse(null, { status: 404 });

  const [payment, profile] = await Promise.all([
    prisma.clientPayment.findFirst({
      where: { id: paymentId, tenantId: membership.tenantId },
      select: {
        id: true,
        concept: true,
        totalAmount: true,
        paidAmount: true,
        paidAt: true,
        method: true,
        partialItems: { orderBy: { paidAt: "asc" }, select: { amount: true, paidAt: true, method: true, note: true } },
      },
    }),
    prisma.tenantBillingProfile.findUnique({ where: { tenantId: membership.tenantId }, select: { legalName: true, taxId: true } }),
  ]);
  // Solo hay comprobante si se pagó algo.
  if (!payment || Number(payment.paidAmount) <= 0) return new NextResponse(null, { status: 404 });

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
    customer: { name: membership.tenant.name, legalName: profile?.legalName, taxId: profile?.taxId, email: membership.tenant.billingEmail },
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
