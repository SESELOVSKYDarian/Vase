import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  amountDue,
  buildPaymentReference,
  customerDescription,
  isMercadoPagoPaymentId,
  isSettleablePayment,
  nextPaymentState,
  parsePaymentReference,
} from "@/lib/billing/mercadopago-rules";
import { rebuildPaymentAllocations } from "@/server/services/payment-allocations";

const API_ORIGIN = "https://api.mercadopago.com";
const REQUEST_TIMEOUT_MS = 15_000;

function accessToken() {
  return String(process.env.MERCADOPAGO_ACCESS_TOKEN ?? "").trim();
}

export function mercadoPagoPublicKey() {
  return String(process.env.MERCADOPAGO_PUBLIC_KEY ?? "").trim();
}

export function isMercadoPagoConfigured() {
  return Boolean(accessToken() && mercadoPagoPublicKey());
}

function appOrigin() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vase.ar";
}

function notificationUrl() {
  return new URL("/api/webhooks/mercadopago", appOrigin()).toString();
}

type MercadoPagoResult<T> = { ok: true; data: T } | { ok: false; status: number };

async function mpRequest<T>(
  path: string,
  init: { method?: string; body?: unknown; idempotencyKey?: string } = {},
): Promise<MercadoPagoResult<T>> {
  const token = accessToken();
  if (!token) throw new Error("MERCADOPAGO_NOT_CONFIGURED");

  const response = await fetch(`${API_ORIGIN}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.idempotencyKey ? { "X-Idempotency-Key": init.idempotencyKey } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) return { ok: false, status: response.status };
  return { ok: true, data: (await response.json()) as T };
}

export type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  expiration: string;
};

type MpCard = {
  id: string;
  last_four_digits?: string;
  expiration_month?: number;
  expiration_year?: number;
  payment_method?: { name?: string; id?: string };
};

function toSavedCard(card: MpCard): SavedCard {
  const month = String(card.expiration_month ?? "").padStart(2, "0");
  const year = String(card.expiration_year ?? "").slice(-2);
  return {
    id: String(card.id),
    brand: card.payment_method?.name ?? card.payment_method?.id ?? "Tarjeta",
    last4: card.last_four_digits ?? "",
    expiration: `${month}/${year}`,
  };
}

export async function listSavedCards(customerId: string | null | undefined): Promise<SavedCard[]> {
  if (!customerId || !isMercadoPagoConfigured()) return [];
  try {
    const result = await mpRequest<MpCard[]>(`/v1/customers/${encodeURIComponent(customerId)}/cards`);
    return result.ok && Array.isArray(result.data) ? result.data.map(toSavedCard) : [];
  } catch {
    return [];
  }
}

export async function ensureMercadoPagoCustomer(input: { tenantId: string; email: string }) {
  const profile = await prisma.tenantBillingProfile.findUnique({
    where: { tenantId: input.tenantId },
    select: { mercadoPagoCustomerId: true },
  });
  if (profile?.mercadoPagoCustomerId) return profile.mercadoPagoCustomerId;

  const description = customerDescription(input.tenantId);
  const created = await mpRequest<{ id: string }>("/v1/customers", {
    method: "POST",
    body: { email: input.email, description },
  });

  let customerId: string | null = created.ok ? created.data.id : null;
  if (!customerId) {
    const found = await mpRequest<{ results?: Array<{ id: string; description?: string }> }>(
      `/v1/customers/search?email=${encodeURIComponent(input.email)}`,
    );
    const match = found.ok ? found.data.results?.find((item) => item.description === description) : undefined;
    // Otra cuenta con el mismo correo: nunca se comparte su cliente ni sus tarjetas.
    if (!match) throw new Error("MERCADOPAGO_CUSTOMER_CONFLICT");
    customerId = match.id;
  }

  await prisma.tenantBillingProfile.upsert({
    where: { tenantId: input.tenantId },
    update: { mercadoPagoCustomerId: customerId },
    create: { tenantId: input.tenantId, mercadoPagoCustomerId: customerId },
  });
  return customerId;
}

export async function addSavedCard(customerId: string, token: string) {
  const result = await mpRequest<MpCard>(`/v1/customers/${encodeURIComponent(customerId)}/cards`, {
    method: "POST",
    body: { token },
  });
  return result.ok ? toSavedCard(result.data) : null;
}

export async function deleteSavedCard(customerId: string, cardId: string) {
  const result = await mpRequest<unknown>(
    `/v1/customers/${encodeURIComponent(customerId)}/cards/${encodeURIComponent(cardId)}`,
    { method: "DELETE" },
  );
  return result.ok;
}

export type PayableClientPayment = {
  id: string;
  concept: string;
  totalAmount: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
};

export async function createCheckoutUrl(payment: PayableClientPayment, payerEmail: string | null) {
  const due = amountDue(Number(payment.totalAmount), Number(payment.paidAmount));
  const backUrl = new URL("/app/billing", appOrigin()).toString();
  const result = await mpRequest<{ init_point?: string }>("/checkout/preferences", {
    method: "POST",
    body: {
      items: [{ title: payment.concept.slice(0, 250), quantity: 1, unit_price: due, currency_id: "ARS" }],
      external_reference: buildPaymentReference(payment.id),
      notification_url: notificationUrl(),
      back_urls: { success: backUrl, pending: backUrl, failure: backUrl },
      auto_return: "approved",
      ...(payerEmail ? { payer: { email: payerEmail } } : {}),
    },
  });
  return result.ok ? (result.data.init_point ?? null) : null;
}

export async function chargeSavedCard(input: {
  payment: PayableClientPayment;
  customerId: string;
  token: string;
}) {
  const due = amountDue(Number(input.payment.totalAmount), Number(input.payment.paidAmount));
  return mpRequest<{ id: number | string; status?: string }>("/v1/payments", {
    method: "POST",
    idempotencyKey: `${input.payment.id}:${input.token}`,
    body: {
      transaction_amount: due,
      token: input.token,
      installments: 1,
      description: input.payment.concept.slice(0, 250),
      external_reference: buildPaymentReference(input.payment.id),
      notification_url: notificationUrl(),
      payer: { type: "customer", id: input.customerId },
    },
  });
}

type MpPayment = {
  id: number | string;
  status?: string;
  currency_id?: string;
  transaction_amount?: number;
  external_reference?: string;
};

/**
 * Acredita un pago preguntándole a Mercado Pago por su id: nunca se confía en lo que
 * llega en el aviso. La fila única por pago evita acreditar dos veces.
 */
export async function settleMercadoPagoPayment(mercadoPagoPaymentId: string) {
  if (!isMercadoPagoPaymentId(mercadoPagoPaymentId)) return { settled: false as const };

  const result = await mpRequest<MpPayment>(`/v1/payments/${mercadoPagoPaymentId}`);
  if (!result.ok) {
    if (result.status === 404) return { settled: false as const };
    throw new Error("MERCADOPAGO_UNAVAILABLE");
  }

  const payment = result.data;
  const clientPaymentId = parsePaymentReference(payment.external_reference);
  if (!clientPaymentId || !isSettleablePayment(payment)) return { settled: false as const };
  const received = payment.transaction_amount as number;

  try {
    const tenantId = await prisma.$transaction(async (tx) => {
      const current = await tx.clientPayment.findUnique({
        where: { id: clientPaymentId },
        select: { id: true, tenantId: true, totalAmount: true, paidAmount: true },
      });
      if (!current) return null;

      await tx.mercadoPagoPaymentRecord.create({
        data: {
          mercadoPagoPaymentId,
          clientPaymentId: current.id,
          tenantId: current.tenantId,
          amount: received,
        },
      });
      const next = nextPaymentState({
        total: Number(current.totalAmount),
        paid: Number(current.paidAmount),
        received,
      });
      await tx.paymentPartialItem.create({
        data: {
          paymentId: current.id,
          amount: received,
          paidAt: new Date(),
          method: "Mercado Pago",
          note: `Mercado Pago ${mercadoPagoPaymentId}`,
        },
      });
      await tx.clientPayment.update({
        where: { id: current.id },
        data: {
          paidAmount: next.paid,
          method: "Mercado Pago",
          ...(next.settled ? { paidAt: new Date(), status: "ACTIVE" as const } : {}),
        },
      });
      return current.tenantId;
    });

    if (!tenantId) return { settled: false as const };
    await rebuildPaymentAllocations(clientPaymentId);
    return { settled: true as const, tenantId };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { settled: false as const };
    }
    throw error;
  }
}
