"use server";

import { revalidatePath } from "next/cache";
import { requireTenantRole, tenantRoles } from "@/lib/auth/guards";
import { amountDue, paymentResultMessage } from "@/lib/billing/mercadopago-rules";
import { prisma } from "@/lib/db/prisma";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { sanitizeText } from "@/lib/security/sanitize";
import { createAuditLog } from "@/server/services/audit-log";
import {
  addSavedCard,
  chargeSavedCard,
  createCheckoutUrl,
  deleteSavedCard,
  ensureMercadoPagoCustomer,
  isMercadoPagoConfigured,
  listSavedCards,
  settleMercadoPagoPayment,
} from "@/server/services/mercadopago";

export type BillingActionResult = { ok: boolean; message?: string; url?: string };

const NOT_AVAILABLE: BillingActionResult = { ok: false, message: "Este medio de pago no está disponible por ahora." };
const GENERIC_ERROR: BillingActionResult = { ok: false, message: "No pudimos completar la operación. Probá de nuevo." };
const MAX_TOKEN_LENGTH = 200;

function isValidToken(token: unknown): token is string {
  return typeof token === "string" && token.length > 0 && token.length <= MAX_TOKEN_LENGTH;
}

async function requireBillingOwner() {
  return requireTenantRole(tenantRoles.OWNER);
}

async function findPayable(paymentId: string, tenantId: string) {
  const payment = await prisma.clientPayment.findFirst({
    where: { id: paymentId, tenantId, paidAt: null, status: { not: "CANCELED" } },
    select: { id: true, concept: true, totalAmount: true, paidAmount: true },
  });
  if (!payment || amountDue(Number(payment.totalAmount), Number(payment.paidAmount)) <= 0) return null;
  return payment;
}

async function limitPayments(tenantId: string) {
  await enforceRateLimit({ scope: "billing:pay", key: tenantId, limit: 20, windowSeconds: 60 * 15 });
}

function refresh() {
  revalidatePath("/app/billing");
  revalidatePath("/app/settings");
  revalidatePath("/app");
}

export async function startMercadoPagoCheckoutAction(paymentId: string): Promise<BillingActionResult> {
  if (!isMercadoPagoConfigured()) return NOT_AVAILABLE;
  try {
    const { session, membership } = await requireBillingOwner();
    await limitPayments(membership.tenantId);
    const payment = await findPayable(paymentId, membership.tenantId);
    if (!payment) return { ok: false, message: "Ese pago ya no está pendiente." };

    const url = await createCheckoutUrl(payment, session.user.email ?? null);
    if (!url) return GENERIC_ERROR;
    await createAuditLog({
      action: "billing.checkout_started",
      targetType: "client_payment",
      targetId: payment.id,
      tenantId: membership.tenantId,
      actorUserId: session.user.id,
    });
    return { ok: true, url };
  } catch {
    return GENERIC_ERROR;
  }
}

export async function payWithSavedCardAction(input: { paymentId: string; token: string }): Promise<BillingActionResult> {
  if (!isMercadoPagoConfigured()) return NOT_AVAILABLE;
  if (!isValidToken(input.token)) return GENERIC_ERROR;

  try {
    const { session, membership } = await requireBillingOwner();
    await limitPayments(membership.tenantId);
    const [payment, profile] = await Promise.all([
      findPayable(input.paymentId, membership.tenantId),
      prisma.tenantBillingProfile.findUnique({
        where: { tenantId: membership.tenantId },
        select: { mercadoPagoCustomerId: true },
      }),
    ]);
    if (!payment) return { ok: false, message: "Ese pago ya no está pendiente." };
    if (!profile?.mercadoPagoCustomerId) return GENERIC_ERROR;

    const result = await chargeSavedCard({ payment, customerId: profile.mercadoPagoCustomerId, token: input.token });
    if (!result.ok) return { ok: false, message: paymentResultMessage("rejected").message };

    await createAuditLog({
      action: "billing.card_charged",
      targetType: "client_payment",
      targetId: payment.id,
      tenantId: membership.tenantId,
      actorUserId: session.user.id,
      metadata: { status: result.data.status, mercadoPagoPaymentId: String(result.data.id) },
    });

    if (result.data.status === "approved") {
      await settleMercadoPagoPayment(String(result.data.id));
      refresh();
    }
    return paymentResultMessage(result.data.status);
  } catch {
    return GENERIC_ERROR;
  }
}

export async function saveCardAction(token: string): Promise<BillingActionResult> {
  if (!isMercadoPagoConfigured()) return NOT_AVAILABLE;
  if (!isValidToken(token)) return GENERIC_ERROR;

  try {
    const { session, membership } = await requireBillingOwner();
    await enforceRateLimit({ scope: "billing:card", key: membership.tenantId, limit: 10, windowSeconds: 60 * 15 });
    const email = membership.tenant.billingEmail ?? session.user.email;
    if (!email) return { ok: false, message: "Cargá un correo de facturación en Tu negocio." };

    const customerId = await ensureMercadoPagoCustomer({ tenantId: membership.tenantId, email });
    const card = await addSavedCard(customerId, token);
    if (!card) return { ok: false, message: "No pudimos guardar la tarjeta. Revisá los datos." };

    const profile = await prisma.tenantBillingProfile.findUnique({
      where: { tenantId: membership.tenantId },
      select: { defaultCardId: true },
    });
    if (!profile?.defaultCardId) {
      await prisma.tenantBillingProfile.update({
        where: { tenantId: membership.tenantId },
        data: { defaultCardId: card.id },
      });
    }
    await createAuditLog({
      action: "billing.card_saved",
      targetType: "tenant_billing_profile",
      targetId: membership.tenantId,
      tenantId: membership.tenantId,
      actorUserId: session.user.id,
    });
    refresh();
    return { ok: true, message: "Tarjeta guardada." };
  } catch (error) {
    if (error instanceof Error && error.message === "MERCADOPAGO_CUSTOMER_CONFLICT") {
      return { ok: false, message: "Ese correo de facturación ya está en uso en Mercado Pago. Cambialo en Tu negocio." };
    }
    return GENERIC_ERROR;
  }
}

async function requireOwnedCard(cardId: string) {
  const { session, membership } = await requireBillingOwner();
  const profile = await prisma.tenantBillingProfile.findUnique({
    where: { tenantId: membership.tenantId },
    select: { mercadoPagoCustomerId: true, defaultCardId: true },
  });
  const cards = await listSavedCards(profile?.mercadoPagoCustomerId);
  if (!profile?.mercadoPagoCustomerId || !cards.some((card) => card.id === cardId)) return null;
  return { session, membership, profile, customerId: profile.mercadoPagoCustomerId, cards };
}

export async function setDefaultCardAction(cardId: string): Promise<BillingActionResult> {
  try {
    const owned = await requireOwnedCard(cardId);
    if (!owned) return GENERIC_ERROR;
    await prisma.tenantBillingProfile.update({
      where: { tenantId: owned.membership.tenantId },
      data: { defaultCardId: cardId },
    });
    refresh();
    return { ok: true };
  } catch {
    return GENERIC_ERROR;
  }
}

export async function removeCardAction(cardId: string): Promise<BillingActionResult> {
  try {
    const owned = await requireOwnedCard(cardId);
    if (!owned) return GENERIC_ERROR;
    if (!(await deleteSavedCard(owned.customerId, cardId))) return GENERIC_ERROR;

    if (owned.profile.defaultCardId === cardId) {
      const next = owned.cards.find((card) => card.id !== cardId)?.id ?? null;
      await prisma.tenantBillingProfile.update({
        where: { tenantId: owned.membership.tenantId },
        data: { defaultCardId: next },
      });
    }
    await createAuditLog({
      action: "billing.card_removed",
      targetType: "tenant_billing_profile",
      targetId: owned.membership.tenantId,
      tenantId: owned.membership.tenantId,
      actorUserId: owned.session.user.id,
    });
    refresh();
    return { ok: true };
  } catch {
    return GENERIC_ERROR;
  }
}

const MAX_FIELD_LENGTH = 191;

function field(formData: FormData, name: string) {
  return sanitizeText(String(formData.get(name) ?? "")).trim().slice(0, MAX_FIELD_LENGTH) || null;
}

export async function updateBillingProfileAction(formData: FormData) {
  const { membership } = await requireBillingOwner();
  const data = {
    legalName: field(formData, "legalName"),
    taxId: field(formData, "taxId"),
    taxCondition: field(formData, "taxCondition"),
    fiscalAddress: field(formData, "fiscalAddress"),
  };
  await prisma.tenantBillingProfile.upsert({
    where: { tenantId: membership.tenantId },
    update: data,
    create: { tenantId: membership.tenantId, ...data },
  });
  refresh();
}
