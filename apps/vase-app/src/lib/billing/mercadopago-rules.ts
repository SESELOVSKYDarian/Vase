const REFERENCE_PREFIX = "vase-cp:";

export function buildPaymentReference(clientPaymentId: string) {
  return `${REFERENCE_PREFIX}${clientPaymentId}`;
}

export function parsePaymentReference(reference: unknown) {
  if (typeof reference !== "string" || !reference.startsWith(REFERENCE_PREFIX)) return null;
  return reference.slice(REFERENCE_PREFIX.length) || null;
}

export function amountDue(total: number, paid: number) {
  return Math.max(0, Math.round((total - paid) * 100) / 100);
}

/** Solo un pago aprobado, en pesos y con importe válido se acredita. */
export function isSettleablePayment(payment: {
  status?: unknown;
  currency_id?: unknown;
  transaction_amount?: unknown;
}) {
  return (
    payment.status === "approved" &&
    payment.currency_id === "ARS" &&
    typeof payment.transaction_amount === "number" &&
    payment.transaction_amount > 0
  );
}

export function nextPaymentState(input: { total: number; paid: number; received: number }) {
  const paid = Math.min(input.total, Math.round((input.paid + input.received) * 100) / 100);
  const settled = paid >= input.total;
  return { paid, settled };
}

export function isMercadoPagoPaymentId(value: unknown): value is string {
  return typeof value === "string" && /^\d{1,30}$/.test(value);
}

/** Un cliente de Mercado Pago solo se reutiliza si lo creó esta misma cuenta de Vase. */
export function customerDescription(tenantId: string) {
  return `vase-tenant:${tenantId}`;
}

export function paymentResultMessage(status: unknown) {
  switch (status) {
    case "approved":
      return { ok: true, message: "Pago aprobado." };
    case "in_process":
    case "pending":
      return { ok: true, message: "Tu pago está en revisión. Te avisamos cuando se acredite." };
    default:
      return { ok: false, message: "El pago fue rechazado. Probá con otra tarjeta u otro medio." };
  }
}
