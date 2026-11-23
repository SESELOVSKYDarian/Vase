// Débito automático de las facturas de Vase con Mercado Pago. Usa una suscripción ("preapproval") por cuenta:
// el cliente autoriza su tarjeta una vez en Mercado Pago y cada mes se cobra solo. El monto se ajusta a lo que
// debe (la factura pendiente más vieja) y cada cobro se acredita a esa factura.
import { appConfig } from "@/config/app";
import { amountDue, isMercadoPagoPaymentId, isSettleablePayment } from "@/lib/billing/mercadopago-rules";
import { prisma } from "@/lib/db/prisma";
import { createAuditLog } from "@/server/services/audit-log";
import { sendNoticeEmail } from "@/server/services/auth-email";
import { creditClientPayment, isMercadoPagoConfigured, mpRequest } from "@/server/services/mercadopago";

const REFERENCE_PREFIX = "vase-ad:";
export const AUTO_DEBIT_STATUSES = ["pending", "authorized", "paused", "cancelled"] as const;
export type AutoDebitStatus = (typeof AUTO_DEBIT_STATUSES)[number];

type MpPreapproval = {
  id: string;
  status?: string;
  init_point?: string;
  external_reference?: string;
  auto_recurring?: { transaction_amount?: number };
};

type MpAuthorizedPayment = {
  id: number | string;
  preapproval_id?: string;
  payment?: { id?: number | string; status?: string };
};

type MpPayment = { id: number | string; status?: string; currency_id?: string; transaction_amount?: number };

const appOrigin = () => (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vase.ar").replace(/\/+$/, "");

export function normalizeAutoDebitStatus(value: unknown): AutoDebitStatus {
  return AUTO_DEBIT_STATUSES.includes(value as AutoDebitStatus) ? (value as AutoDebitStatus) : "pending";
}

/** Lo que se cobra en el próximo débito: lo que falta de la factura pendiente más vieja. */
export async function nextAutoDebitAmount(tenantId: string) {
  const oldest = await prisma.clientPayment.findFirst({
    where: { tenantId, paidAt: null, status: { not: "CANCELED" } },
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
    select: { id: true, totalAmount: true, paidAmount: true },
  });
  return oldest ? { invoiceId: oldest.id, amount: amountDue(Number(oldest.totalAmount), Number(oldest.paidAmount)) } : null;
}

/**
 * Crea la suscripción en Mercado Pago y devuelve el enlace para que el cliente autorice su tarjeta.
 * amount: lo que se debe hoy; si no debe nada, el último monto facturado.
 */
export async function startAutoDebit(input: { tenantId: string; tenantName: string; payerEmail: string; userId: string }) {
  if (!isMercadoPagoConfigured()) return { ok: false as const, message: "El pago automático no está disponible por ahora." };

  const next = await nextAutoDebitAmount(input.tenantId);
  const last = next
    ? null
    : await prisma.clientPayment.findFirst({ where: { tenantId: input.tenantId }, orderBy: { createdAt: "desc" }, select: { totalAmount: true } });
  const amount = next?.amount || Number(last?.totalAmount ?? 0);
  if (!(amount > 0)) return { ok: false as const, message: "Todavía no tenés facturas para debitar. Lo podés activar cuando llegue la primera." };

  const result = await mpRequest<MpPreapproval>("/preapproval", {
    method: "POST",
    body: {
      reason: `Vase · ${input.tenantName}`.slice(0, 250),
      external_reference: `${REFERENCE_PREFIX}${input.tenantId}`,
      payer_email: input.payerEmail,
      back_url: `${appOrigin()}/app/billing?debito=1`,
      auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: amount, currency_id: "ARS" },
      status: "pending",
    },
  });
  if (!result.ok || !result.data.id || !result.data.init_point) {
    return { ok: false as const, message: "Mercado Pago no pudo preparar el pago automático. Revisá que el correo sea el de la cuenta de Mercado Pago que va a pagar." };
  }

  // Si había uno anterior sin usar, se reemplaza.
  await prisma.billingAutoDebit.upsert({
    where: { tenantId: input.tenantId },
    update: { externalId: result.data.id, status: "pending", amount, payerEmail: input.payerEmail, createdByUserId: input.userId },
    create: { tenantId: input.tenantId, externalId: result.data.id, status: "pending", amount, payerEmail: input.payerEmail, createdByUserId: input.userId },
  });
  await createAuditLog({
    action: "billing.autodebit_started",
    targetType: "billing_auto_debit",
    targetId: result.data.id,
    tenantId: input.tenantId,
    actorUserId: input.userId,
    metadata: { amount },
  });
  return { ok: true as const, url: result.data.init_point };
}

/** Trae el estado real de la suscripción desde Mercado Pago y lo guarda. */
export async function refreshAutoDebit(preapprovalId: string) {
  const row = await prisma.billingAutoDebit.findUnique({ where: { externalId: preapprovalId } });
  if (!row) return null;
  const result = await mpRequest<MpPreapproval>(`/preapproval/${encodeURIComponent(preapprovalId)}`);
  if (!result.ok) return row;
  const status = normalizeAutoDebitStatus(result.data.status);
  if (status !== row.status) {
    await prisma.billingAutoDebit.update({ where: { id: row.id }, data: { status } });
    await createAuditLog({
      action: "billing.autodebit_status",
      targetType: "billing_auto_debit",
      targetId: preapprovalId,
      tenantId: row.tenantId,
      metadata: { from: row.status, to: status },
    });
  }
  return { ...row, status };
}

/** Pausar, reactivar o cancelar desde Plan y pagos. */
export async function changeAutoDebitStatus(tenantId: string, status: "paused" | "authorized" | "cancelled") {
  const row = await prisma.billingAutoDebit.findUnique({ where: { tenantId } });
  if (!row) return false;
  const result = await mpRequest<MpPreapproval>(`/preapproval/${encodeURIComponent(row.externalId)}`, { method: "PUT", body: { status } });
  if (!result.ok) return false;
  await prisma.billingAutoDebit.update({ where: { id: row.id }, data: { status } });
  return true;
}

/** Ajusta el monto del próximo débito a lo que se debe ahora. No falla: si Mercado Pago no responde, queda el anterior. */
export async function syncAutoDebitAmount(tenantId: string) {
  try {
    if (!isMercadoPagoConfigured()) return;
    const row = await prisma.billingAutoDebit.findUnique({ where: { tenantId } });
    if (!row || (row.status !== "authorized" && row.status !== "paused")) return;
    const next = await nextAutoDebitAmount(tenantId);
    if (!next || !(next.amount > 0) || Math.abs(next.amount - Number(row.amount)) < 0.01) return;
    const result = await mpRequest<MpPreapproval>(`/preapproval/${encodeURIComponent(row.externalId)}`, {
      method: "PUT",
      body: { auto_recurring: { transaction_amount: next.amount, currency_id: "ARS" } },
    });
    if (result.ok) await prisma.billingAutoDebit.update({ where: { id: row.id }, data: { amount: next.amount } });
  } catch {
    // el próximo cambio de factura vuelve a intentarlo
  }
}

/**
 * Un cobro del débito automático: se verifica en Mercado Pago (nunca se confía en el aviso) y se acredita a la
 * factura pendiente más vieja. Si no había nada pendiente, se avisa a facturación para devolverlo o imputarlo.
 */
export async function settleAutoDebitCharge(authorizedPaymentId: string) {
  if (!/^\d{1,30}$/.test(authorizedPaymentId)) return { settled: false as const };
  const charge = await mpRequest<MpAuthorizedPayment>(`/authorized_payments/${authorizedPaymentId}`);
  if (!charge.ok) {
    if (charge.status === 404) return { settled: false as const };
    throw new Error("MERCADOPAGO_UNAVAILABLE");
  }
  const paymentId = String(charge.data.payment?.id ?? "");
  const preapprovalId = String(charge.data.preapproval_id ?? "");
  if (!isMercadoPagoPaymentId(paymentId) || !preapprovalId) return { settled: false as const };

  const row = await prisma.billingAutoDebit.findUnique({ where: { externalId: preapprovalId } });
  if (!row) return { settled: false as const };
  const payment = await mpRequest<MpPayment>(`/v1/payments/${paymentId}`);
  if (!payment.ok) throw new Error("MERCADOPAGO_UNAVAILABLE");
  if (!isSettleablePayment(payment.data)) return { settled: false as const };

  // Ya acreditado antes (mismo pago de Mercado Pago): no se vuelve a sumar.
  const already = await prisma.mercadoPagoPaymentRecord.findFirst({ where: { mercadoPagoPaymentId: paymentId }, select: { id: true } });
  if (already) return { settled: false as const };

  const next = await nextAutoDebitAmount(row.tenantId);
  if (!next) {
    await createAuditLog({
      action: "billing.autodebit_unmatched",
      targetType: "billing_auto_debit",
      targetId: preapprovalId,
      tenantId: row.tenantId,
      metadata: { mercadoPagoPaymentId: paymentId, amount: payment.data.transaction_amount },
    });
    await sendNoticeEmail({
      email: appConfig.emails.facturacion,
      subject: "Pago automático sin factura pendiente",
      message: `Mercado Pago cobró $${payment.data.transaction_amount} (pago ${paymentId}) a una cuenta que no tenía facturas pendientes. Revisalo en Admin.`,
    }).catch(() => null);
    return { settled: false as const };
  }

  const result = await creditClientPayment({
    clientPaymentId: next.invoiceId,
    mercadoPagoPaymentId: paymentId,
    received: payment.data.transaction_amount as number,
  });
  await syncAutoDebitAmount(row.tenantId);
  return result;
}
