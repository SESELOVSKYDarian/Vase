import { centsToMoney, moneyToCents } from "../cash/money";

type ReconciliationInput = {
  fiscalConfigured: boolean;
  orders: Array<{ id: string; status: string; total: string }>;
  payments: Array<{
    id: string;
    orderId: string;
    status: string;
    provider: string | null;
    reference: string | null;
    amount: string;
  }>;
  attempts: Array<{
    orderId: string;
    status: string;
    providerPaymentId: string | null;
  }>;
  fiscalDocuments: Array<{ orderId: string; status: string }>;
  refunds: Array<{
    id: string;
    paymentId: string;
    status: string;
    amount: string;
  }>;
};

export type ReconciliationDiscrepancy = {
  code: string;
  entityType: "ORDER" | "PAYMENT" | "REFUND";
  entityId: string;
  detail: string;
};

export function buildReconciliation(input: ReconciliationInput) {
  const discrepancies: ReconciliationDiscrepancy[] = [];
  const appliedPayments = input.payments.filter((item) =>
    ["APPLIED", "PARTIALLY_REFUNDED", "REFUNDED"].includes(item.status));
  for (const payment of appliedPayments.filter((item) =>
    item.provider === "MERCADO_PAGO")) {
    const attempt = input.attempts.find((item) =>
      item.status === "APPLIED" &&
      item.orderId === payment.orderId &&
      item.providerPaymentId === payment.reference);
    if (!attempt) {
      discrepancies.push({
        code: "PROVIDER_PAYMENT_MISMATCH",
        entityType: "PAYMENT",
        entityId: payment.id,
        detail: "El pago local no coincide con un intento aplicado de Mercado Pago.",
      });
    }
  }
  for (const order of input.orders) {
    const paid = appliedPayments.filter((item) => item.orderId === order.id)
      .reduce((sum, item) => sum + moneyToCents(item.amount), BigInt(0));
    const refunded = input.refunds.filter((item) =>
      item.status === "APPLIED" &&
      appliedPayments.some((payment) =>
        payment.id === item.paymentId && payment.orderId === order.id))
      .reduce((sum, item) => sum + moneyToCents(item.amount), BigInt(0));
    const expected = moneyToCents(order.total);
    const netPaid = paid - refunded;
    const expectedForState = order.status === "REFUNDED" ? BigInt(0)
      : order.status === "PARTIALLY_REFUNDED" ? expected - refunded
        : expected;
    if (
      ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(order.status) &&
      netPaid !== expectedForState
    ) {
      discrepancies.push({
        code: "ORDER_BALANCE_MISMATCH",
        entityType: "ORDER",
        entityId: order.id,
        detail: `Saldo conciliado ARS ${centsToMoney(netPaid)}; esperado ARS ${
          centsToMoney(expectedForState)
        }.`,
      });
    }
    if (
      input.fiscalConfigured &&
      ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"].includes(order.status) &&
      !input.fiscalDocuments.some((item) =>
        item.orderId === order.id && item.status === "AUTHORIZED")
    ) {
      discrepancies.push({
        code: "FISCAL_DOCUMENT_MISSING",
        entityType: "ORDER",
        entityId: order.id,
        detail: "La orden cobrada no tiene un comprobante fiscal autorizado.",
      });
    }
  }
  for (const refund of input.refunds.filter((item) =>
    ["PENDING", "PROCESSING", "AMBIGUOUS", "PROVIDER_MISMATCH"].includes(
      item.status,
    ))) {
    discrepancies.push({
      code: "REFUND_UNRESOLVED",
      entityType: "REFUND",
      entityId: refund.id,
      detail: `La devolución permanece en estado ${refund.status}.`,
    });
  }
  return {
    generatedAt: new Date().toISOString(),
    discrepancyCount: discrepancies.length,
    discrepancies,
  };
}

export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function reconciliationCsv(
  discrepancies: ReconciliationDiscrepancy[],
) {
  return [
    ["code", "entity_type", "entity_id", "detail"],
    ...discrepancies.map((item) => [
      item.code,
      item.entityType,
      item.entityId,
      item.detail,
    ]),
  ].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
