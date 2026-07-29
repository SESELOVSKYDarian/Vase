export type NormalizedDeliveryOrder = {
  providerOrderId: string;
  status: string;
  total: string;
  currency: string;
  customerName?: string;
  deliveryAddress?: string;
  providerCreatedAt?: string;
  items: Array<{
    sku?: string;
    name: string;
    quantity: number;
    unitPrice: string;
    notes?: string;
  }>;
  providerPayload: unknown;
};

export type DeliveryProviderAdapter = {
  verifyWebhook?(
    rawBody: string,
    headers: Record<string, string>,
  ): Promise<{
    eventId: string;
    eventType: string;
    providerOrderId: string;
  }>;
  fetchOrder?(providerOrderId: string): Promise<NormalizedDeliveryOrder>;
  accept?(
    providerOrderId: string,
    idempotencyKey: string,
  ): Promise<{ providerOrderId: string; status: string; response: unknown }>;
  reject?(
    providerOrderId: string,
    idempotencyKey: string,
    reason: string,
  ): Promise<{ providerOrderId: string; status: string; response: unknown }>;
  update?(
    providerOrderId: string,
    idempotencyKey: string,
    status: string,
  ): Promise<{ providerOrderId: string; status: string; response: unknown }>;
  cancel?(
    providerOrderId: string,
    idempotencyKey: string,
    reason: string,
  ): Promise<{ providerOrderId: string; status: string; response: unknown }>;
};

export function noCertifiedDeliveryAdapter() {
  return null;
}
