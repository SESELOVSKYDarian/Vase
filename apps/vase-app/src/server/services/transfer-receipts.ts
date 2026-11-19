// Comprobantes de transferencia: el cliente sube uno para una factura, Vase lo revisa y lo aprueba o rechaza.
// Al aprobarlo la factura queda pagada y la cuenta se pone al día sola.
import { appConfig } from "@/config/app";
import { amountDue, nextPaymentState } from "@/lib/billing/mercadopago-rules";
import { RECEIPT_MAX_BYTES, safeReceiptName, sniffReceiptType } from "@/lib/billing/transfer";
import { prisma } from "@/lib/db/prisma";
import { sanitizeText } from "@/lib/security/sanitize";
import { createAuditLog } from "@/server/services/audit-log";
import { sendNoticeEmail } from "@/server/services/auth-email";
import { activateAfterPayment } from "@/server/services/billing-activation";
import { rebuildPaymentAllocations } from "@/server/services/payment-allocations";

export type ReceiptResult = { ok: true } | { ok: false; message: string };

const formatArs = (value: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);

const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vase.ar").replace(/\/+$/, "");

/** El cliente sube el comprobante de una factura suya. Si ya había uno en revisión, este lo reemplaza. */
export async function submitTransferReceipt(input: {
  tenantId: string;
  userId: string;
  clientPaymentId: string;
  file: File;
  note?: string | null;
}): Promise<ReceiptResult> {
  if (input.file.size <= 0) return { ok: false, message: "Elegí el comprobante." };
  if (input.file.size > RECEIPT_MAX_BYTES) return { ok: false, message: "El archivo pesa más de 5 MB. Probá con una foto o un PDF más liviano." };

  const bytes = new Uint8Array(await input.file.arrayBuffer());
  const contentType = sniffReceiptType(bytes);
  if (!contentType) return { ok: false, message: "Subí una foto (JPG, PNG o WebP) o un PDF." };

  const payment = await prisma.clientPayment.findFirst({
    where: { id: input.clientPaymentId, tenantId: input.tenantId, paidAt: null, status: { not: "CANCELED" } },
    select: { id: true, concept: true, totalAmount: true, paidAmount: true, tenant: { select: { name: true } } },
  });
  if (!payment) return { ok: false, message: "Esa factura ya no está pendiente." };

  const note = input.note ? sanitizeText(input.note).trim().slice(0, 500) || null : null;
  const receipt = await prisma.$transaction(async (tx) => {
    await tx.transferReceipt.deleteMany({ where: { clientPaymentId: payment.id, status: "PENDING" } });
    return tx.transferReceipt.create({
      data: {
        tenantId: input.tenantId,
        clientPaymentId: payment.id,
        uploadedByUserId: input.userId,
        fileName: safeReceiptName(input.file.name, contentType),
        contentType,
        sizeBytes: bytes.byteLength,
        data: Buffer.from(bytes),
        note,
      },
      select: { id: true },
    });
  });

  await createAuditLog({
    action: "billing.transfer_receipt_uploaded",
    targetType: "transfer_receipt",
    targetId: receipt.id,
    tenantId: input.tenantId,
    actorUserId: input.userId,
    metadata: { clientPaymentId: payment.id, contentType, sizeBytes: bytes.byteLength },
  });
  // Aviso a facturación de Vase para que lo revise.
  await sendNoticeEmail({
    email: appConfig.emails.facturacion,
    subject: `Comprobante para revisar · ${payment.tenant.name}`,
    message: `${payment.tenant.name} subió un comprobante de transferencia por ${formatArs(
      amountDue(Number(payment.totalAmount), Number(payment.paidAmount)),
    )} (${payment.concept}). Revisalo en Admin › Finanzas.`,
  }).catch(() => null);
  return { ok: true };
}

/** Admin aprueba: la factura suma lo recibido (por defecto, todo lo que debía) y, si queda pagada, la cuenta se activa. */
export async function approveTransferReceipt(input: { receiptId: string; reviewerId: string; amount?: number | null }): Promise<ReceiptResult> {
  const receipt = await prisma.transferReceipt.findUnique({
    where: { id: input.receiptId },
    select: {
      id: true,
      status: true,
      tenantId: true,
      clientPayment: { select: { id: true, concept: true, totalAmount: true, paidAmount: true, paidAt: true } },
      tenant: { select: { name: true, billingEmail: true } },
    },
  });
  if (!receipt || receipt.status !== "PENDING") return { ok: false, message: "Ese comprobante ya fue revisado." };
  const payment = receipt.clientPayment;
  const due = amountDue(Number(payment.totalAmount), Number(payment.paidAmount));
  const received = input.amount && input.amount > 0 ? Math.min(Math.round(input.amount * 100) / 100, due) : due;
  if (payment.paidAt || received <= 0) return { ok: false, message: "Esa factura ya está pagada." };

  const next = nextPaymentState({ total: Number(payment.totalAmount), paid: Number(payment.paidAmount), received });
  const claimed = await prisma.$transaction(async (tx) => {
    // Solo una revisión gana si dos personas aprueban a la vez.
    const updated = await tx.transferReceipt.updateMany({
      where: { id: receipt.id, status: "PENDING" },
      data: { status: "APPROVED", reviewedByUserId: input.reviewerId, reviewedAt: new Date() },
    });
    if (updated.count === 0) return false;
    await tx.paymentPartialItem.create({
      data: { paymentId: payment.id, amount: received, paidAt: new Date(), method: "Transferencia", note: `Comprobante ${receipt.id}` },
    });
    await tx.clientPayment.update({
      where: { id: payment.id },
      data: { paidAmount: next.paid, method: "Transferencia", ...(next.settled ? { paidAt: new Date(), status: "ACTIVE" as const } : {}) },
    });
    return true;
  });
  if (!claimed) return { ok: false, message: "Ese comprobante ya fue revisado." };

  await rebuildPaymentAllocations(payment.id).catch(() => null);
  if (next.settled) await activateAfterPayment(payment.id, "transfer");
  await createAuditLog({
    action: "billing.transfer_receipt_approved",
    targetType: "transfer_receipt",
    targetId: receipt.id,
    tenantId: receipt.tenantId,
    actorUserId: input.reviewerId,
    metadata: { clientPaymentId: payment.id, received, settled: next.settled },
  });
  if (receipt.tenant.billingEmail) {
    await sendNoticeEmail({
      email: receipt.tenant.billingEmail,
      subject: "Recibimos tu transferencia",
      message: next.settled
        ? `Confirmamos tu pago de ${formatArs(received)} por ${payment.concept}. Tu cuenta está al día. Gracias.`
        : `Confirmamos ${formatArs(received)} de ${payment.concept}. Todavía quedan ${formatArs(due - received)} por pagar.`,
    }).catch(() => null);
  }
  return { ok: true };
}

/** Admin rechaza con un motivo que le llega al cliente; la factura sigue pendiente. */
export async function rejectTransferReceipt(input: { receiptId: string; reviewerId: string; reason: string }): Promise<ReceiptResult> {
  const reason = sanitizeText(input.reason).trim().slice(0, 500);
  if (reason.length < 4) return { ok: false, message: "Escribí el motivo para que el cliente sepa qué corregir." };
  const receipt = await prisma.transferReceipt.findUnique({
    where: { id: input.receiptId },
    select: { id: true, tenantId: true, status: true, clientPayment: { select: { concept: true } }, tenant: { select: { billingEmail: true } } },
  });
  if (!receipt || receipt.status !== "PENDING") return { ok: false, message: "Ese comprobante ya fue revisado." };

  const updated = await prisma.transferReceipt.updateMany({
    where: { id: receipt.id, status: "PENDING" },
    data: { status: "REJECTED", rejectReason: reason, reviewedByUserId: input.reviewerId, reviewedAt: new Date() },
  });
  if (updated.count === 0) return { ok: false, message: "Ese comprobante ya fue revisado." };

  await createAuditLog({
    action: "billing.transfer_receipt_rejected",
    targetType: "transfer_receipt",
    targetId: receipt.id,
    tenantId: receipt.tenantId,
    actorUserId: input.reviewerId,
    metadata: { reason },
  });
  if (receipt.tenant.billingEmail) {
    await sendNoticeEmail({
      email: receipt.tenant.billingEmail,
      subject: "No pudimos confirmar tu transferencia",
      message: `Revisamos el comprobante de ${receipt.clientPayment.concept} y no pudimos confirmarlo: ${reason}. Podés subir otro desde ${appUrl()}/app/billing.`,
    }).catch(() => null);
  }
  return { ok: true };
}
