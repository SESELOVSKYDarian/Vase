import { createHash } from "node:crypto";
import { z } from "zod";
import type {
  DeliveryProviderAdapter,
  NormalizedDeliveryOrder,
} from "./provider-adapter";

type Connection = {
  id: string;
  globalTenantId: string;
  status: string;
  provider: string;
};

type WebhookRepository = {
  findEvent(connectionId: string, eventId: string): Promise<unknown | null>;
  getConnection(connectionId: string): Promise<Connection | null>;
  adapterFor(connection: Connection): DeliveryProviderAdapter | null;
  store(input: {
    connection: Connection;
    eventId: string;
    eventType: string;
    payloadHash: string;
    normalizedOrder: NormalizedDeliveryOrder;
  }): Promise<unknown>;
};

const normalizedSchema = z.object({
  providerOrderId: z.string().min(1),
  status: z.string().min(1),
  total: z.string().regex(/^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/),
  currency: z.string().length(3),
  customerName: z.string().optional(),
  deliveryAddress: z.string().optional(),
  providerCreatedAt: z.string().datetime().optional(),
  items: z.array(z.object({
    sku: z.string().optional(),
    name: z.string().min(1),
    quantity: z.number().int().positive(),
    unitPrice: z.string().regex(/^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/),
    notes: z.string().optional(),
  }).strict()).min(1),
  providerPayload: z.unknown(),
}).strict();

export function createDeliveryWebhookService(repository: WebhookRepository) {
  return {
    async accept(raw: unknown) {
      const input = z.object({
        connectionId: z.string().min(1),
        rawBody: z.string().min(1).max(2_000_000),
        headers: z.record(z.string(), z.string()),
      }).strict().parse(raw);
      const connection = await repository.getConnection(input.connectionId);
      if (!connection || connection.status !== "ACTIVE") {
        throw new Error("REST_DELIVERY_CONNECTION_INACTIVE");
      }
      const adapter = repository.adapterFor(connection);
      if (!adapter?.verifyWebhook || !adapter.fetchOrder) {
        throw new Error("REST_DELIVERY_CERTIFICATION_REQUIRED");
      }
      const verified = await adapter.verifyWebhook(input.rawBody, input.headers);
      const prior = await repository.findEvent(connection.id, verified.eventId);
      if (prior) return prior;
      const normalizedOrder = normalizedSchema.parse(
        await adapter.fetchOrder(verified.providerOrderId),
      );
      if (normalizedOrder.providerOrderId !== verified.providerOrderId) {
        throw new Error("REST_DELIVERY_PROVIDER_ORDER_MISMATCH");
      }
      return repository.store({
        connection,
        eventId: verified.eventId,
        eventType: verified.eventType,
        payloadHash: createHash("sha256").update(input.rawBody).digest("hex"),
        normalizedOrder,
      });
    },
  };
}
