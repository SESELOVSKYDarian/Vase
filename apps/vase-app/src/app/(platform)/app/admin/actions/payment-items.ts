"use server";

// Pagos parciales y facturas adjuntas.
import { revalidatePath } from "next/cache";
import { requireVerifiedUser } from "@/lib/auth/guards";
import { adminPermissions, requireAdminPermission } from "@/lib/auth/admin-permissions";
import { prisma } from "@/lib/db/prisma";
import { rebuildPaymentAllocations } from "@/server/services/payment-allocations";
import { getRequestContext } from "@/lib/security/request";
import { sanitizeNullableText } from "@/lib/security/sanitize";
import { addPaymentPartialItemSchema, attachPaymentInvoiceSchema } from "@/lib/validators/admin";
import { createAuditLog } from "@/server/services/audit-log";
import { toNullableDate } from "./shared";

export async function addPaymentPartialItemAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();

  const parsed = addPaymentPartialItemSchema.safeParse({
    paymentId: formData.get("paymentId"),
    amount: formData.get("amount"),
    paidAt: String(formData.get("paidAt") ?? ""),
    method: sanitizeNullableText(String(formData.get("method") ?? "")) ?? undefined,
    note: sanitizeNullableText(String(formData.get("note") ?? "")) ?? undefined,
  });
  if (!parsed.success) return;

  const payment = await prisma.clientPayment.findUnique({
    where: { id: parsed.data.paymentId },
    select: { id: true, tenantId: true, totalAmount: true, paidAmount: true, concept: true, status: true },
  });
  if (!payment) return;

  const newPaidAmount = Number(payment.paidAmount) + parsed.data.amount;
  const totalAmount = Number(payment.totalAmount);
  const normalizedPaid = Math.min(newPaidAmount, totalAmount);
  const nextStatus =
    normalizedPaid >= totalAmount ? "ACTIVE" : payment.status === "CANCELED" ? "CANCELED" : "PAST_DUE";

  await prisma.$transaction(async (tx) => {
    await tx.paymentPartialItem.create({
      data: {
        paymentId: payment.id,
        amount: parsed.data.amount,
        paidAt: toNullableDate(parsed.data.paidAt ?? "") ?? new Date(),
        method: parsed.data.method ?? null,
        note: parsed.data.note ?? null,
      },
    });

    await tx.clientPayment.update({
      where: { id: payment.id },
      data: {
        paidAmount: normalizedPaid,
        paidAt: new Date(),
        status: nextStatus,
      },
    });
  });

  await rebuildPaymentAllocations(payment.id);

  await createAuditLog({
    action: "platform.client_payment_partial_added",
    targetType: "client_payment",
    targetId: payment.id,
    tenantId: payment.tenantId,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      amount: parsed.data.amount,
      nextPaidAmount: normalizedPaid,
      totalAmount,
      method: parsed.data.method ?? null,
    },
  });

  revalidatePath("/app/admin/clients");
  revalidatePath("/app/admin/finance");
}

export async function attachPaymentInvoiceAction(formData: FormData): Promise<void> {
  await requireAdminPermission(adminPermissions.BILLING);
  const session = await requireVerifiedUser();
  const requestContext = await getRequestContext();

  const parsed = attachPaymentInvoiceSchema.safeParse({
    paymentId: formData.get("paymentId"),
    fileUrl: String(formData.get("fileUrl") ?? ""),
  });
  if (!parsed.success) return;

  const payment = await prisma.clientPayment.findUnique({
    where: { id: parsed.data.paymentId },
    select: { id: true, tenantId: true, concept: true },
  });
  if (!payment) return;

  await (prisma as unknown as { invoiceV2: { create: (args: { data: { paymentId: string; fileUrl: string; uploadedBy: string } }) => Promise<unknown> } }).invoiceV2.create({
    data: {
      paymentId: payment.id,
      fileUrl: parsed.data.fileUrl,
      uploadedBy: session.user.id,
    },
  });

  await createAuditLog({
    action: "platform.client_payment_invoice_attached",
    targetType: "client_payment",
    targetId: payment.id,
    tenantId: payment.tenantId,
    actorUserId: session.user.id,
    ipAddress: requestContext.ipAddress,
    userAgent: requestContext.userAgent,
    metadata: {
      fileUrl: parsed.data.fileUrl,
    },
  });

  revalidatePath("/app/admin/clients");
  revalidatePath("/app/admin/finance");
}
