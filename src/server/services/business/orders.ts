import { CheckoutMethod, OrderChannel, OrderStatus, PaymentStatus } from "@prisma/client";
import {
  createOrderPayment,
  createOrderWithItems,
  getLatestPaymentForOrder,
  getOrderById,
  updateOrderStatus,
} from "@/server/queries/business/orders";
import { type CheckoutItemInput, normalizeOrderChannel, normalizePaymentMethod, validateCheckoutItems } from "@/server/services/business/checkout";
import { createOrderNumber, roundMoney } from "@/server/services/business/shared";

export function formatOrderAmount(value: number, currency = "ARS") {
  return `${roundMoney(value).toFixed(2)} ${currency}`;
}

export function formatCheckoutModeLabel(mode: string) {
  if (mode === "transfer") return "Transferencia bancaria";
  if (mode === "online") return "Pago online";
  if (mode === "cash_on_pickup") return "Pago en local";
  if (mode === "email") return "Gmail";
  if (mode === "whatsapp") return "WhatsApp";
  return "Manual";
}

export function formatOrderChannelLabel(channel: string) {
  if (channel === "email") return "Gmail";
  if (channel === "whatsapp") return "WhatsApp";
  return "Web";
}

export function normalizeBillingInfo(customer: Record<string, unknown> = {}) {
  const billing = customer.billing && typeof customer.billing === "object" ? (customer.billing as Record<string, unknown>) : customer;
  return {
    businessName: String(billing.businessName ?? billing.business_name ?? customer.company ?? "").trim(),
    address: String(billing.address ?? "").trim(),
    city: String(billing.city ?? "").trim(),
    vatType: String(billing.vatType ?? billing.vat_type ?? "").trim().toLowerCase(),
    documentType: String(billing.documentType ?? billing.document_type ?? "cuit").trim().toLowerCase(),
    documentNumber: String(billing.documentNumber ?? billing.document_number ?? customer.cuit ?? "").trim(),
  };
}

export function hasBillingInfo(customer: Record<string, unknown> = {}) {
  const billing = normalizeBillingInfo(customer);
  return Boolean(
    billing.businessName ||
      billing.address ||
      billing.city ||
      billing.vatType ||
      billing.documentNumber,
  );
}

export function buildOrderTemplateVars(input: {
  orderNumber: string;
  customerName?: string | null;
  itemsLabel: string;
  totalLabel: string;
  shippingLabel: string;
  checkoutMethodLabel: string;
  orderChannelLabel: string;
}) {
  return {
    order_number: input.orderNumber,
    customer_name: input.customerName || "",
    items: input.itemsLabel,
    total: input.totalLabel,
    shipping: input.shippingLabel,
    checkout_method: input.checkoutMethodLabel,
    order_channel: input.orderChannelLabel,
  };
}

export function applyOrderTemplate(template: string, vars: Record<string, string>) {
  return Object.entries(vars).reduce((output, [key, value]) => {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
    return output.replace(pattern, value);
  }, template);
}

export async function createOrderFromCheckout(input: {
  tenantId: string;
  userId?: string | null;
  customerType?: "retail" | "wholesale";
  items: CheckoutItemInput[];
  customer: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    shippingLocation?: {
      latitude?: number | null;
      longitude?: number | null;
      lat?: number | null;
      lng?: number | null;
    } | null;
    shippingLatitude?: number | null;
    shippingLongitude?: number | null;
    latitude?: number | null;
    longitude?: number | null;
    billing?: Record<string, unknown>;
  };
  requestedCheckoutMethod?: string | null;
  requestedOrderChannel?: string | null;
  notes?: string | null;
}) {
  const checkout = await validateCheckoutItems({
    tenantId: input.tenantId,
    items: input.items,
    userId: input.userId,
    customerType: input.customerType,
    shippingCustomer: input.customer,
  });

  if (!checkout.valid) {
    return {
      error: "invalid_checkout_items",
      details: checkout.errors,
    };
  }

  const checkoutMethod = normalizePaymentMethod(input.requestedCheckoutMethod);
  const orderChannel = normalizeOrderChannel(input.requestedOrderChannel);
  const orderNumber = createOrderNumber();

  const order = await createOrderWithItems({
    order: {
      tenantId: input.tenantId,
      placedByUserId: input.userId ?? null,
      orderNumber,
      status: OrderStatus.PENDING,
      checkoutMethod: checkoutMethod.toUpperCase() as CheckoutMethod,
      orderChannel: orderChannel.toUpperCase() as OrderChannel,
      currency: checkout.currency,
      subtotalAmount: checkout.subtotal,
      shippingAmount: checkout.shippingAmount,
      totalAmount: checkout.total,
      customerName: input.customer.name || null,
      customerEmail: input.customer.email || null,
      customerPhone: input.customer.phone || null,
      billingInfo: hasBillingInfo(input.customer) ? normalizeBillingInfo(input.customer) : undefined,
      shippingInfo: checkout.shippingQuote?.ok ? checkout.shippingQuote : undefined,
      notes: input.notes || null,
    },
    items: checkout.items.map((item) => ({
      orderId: "",
      productId: item.productId,
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalAmount: item.totalAmount,
      currency: item.currency,
      snapshot: item.snapshot,
    })),
  });

  return {
    order,
    checkout,
    checkoutMethodLabel: formatCheckoutModeLabel(checkoutMethod),
    orderChannelLabel: formatOrderChannelLabel(orderChannel),
  };
}

export async function registerOrderPayment(input: {
  tenantId: string;
  orderId: string;
  provider: string;
  amount: number;
  currency: string;
  reference?: string | null;
  externalId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  return createOrderPayment({
    tenantId: input.tenantId,
    orderId: input.orderId,
    provider: input.provider,
    amount: input.amount,
    currency: input.currency,
    status: PaymentStatus.PENDING,
    reference: input.reference || null,
    externalId: input.externalId || null,
    metadata: input.metadata,
  });
}

export async function syncOrderPaymentStatus(tenantId: string, orderId: string) {
  const [order, latestPayment] = await Promise.all([
    getOrderById(tenantId, orderId),
    getLatestPaymentForOrder(orderId),
  ]);

  if (!order || !latestPayment) {
    return null;
  }

  const nextStatus =
    latestPayment.status === PaymentStatus.PAID
      ? OrderStatus.CONFIRMED
      : latestPayment.status === PaymentStatus.FAILED || latestPayment.status === PaymentStatus.CANCELED
        ? OrderStatus.CANCELED
        : order.status;

  if (nextStatus !== order.status) {
    await updateOrderStatus(tenantId, orderId, nextStatus);
  }

  return {
    orderId,
    orderStatus: nextStatus,
    paymentStatus: latestPayment.status,
  };
}
