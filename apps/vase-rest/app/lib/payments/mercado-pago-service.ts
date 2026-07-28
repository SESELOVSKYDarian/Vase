import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";

export function mercadoPagoSignatureManifest(input: {
  dataId: string;
  requestId: string;
  timestamp: string;
}) {
  return `id:${input.dataId.toLowerCase()};request-id:${input.requestId};ts:${input.timestamp};`;
}

type WebhookRepository = {
  findEvent(globalTenantId: string, requestId: string): Promise<unknown | null>;
  saveEvent(event: Record<string, unknown>): Promise<unknown>;
  reconcile(globalTenantId: string, providerOrderId: string): Promise<unknown>;
};

export function createMercadoPagoWebhookService(
  repository: WebhookRepository & { now?: () => Date },
) {
  return {
    async accept(raw: unknown) {
      const input = z.object({
        globalTenantId: z.string().min(1),
        dataId: z.string().min(1),
        requestId: z.string().min(1),
        xSignature: z.string().min(1),
        secret: z.string().min(1),
      }).strict().parse(raw);
      const parts = Object.fromEntries(input.xSignature.split(",").map((part) => {
        const [key, value] = part.trim().split("=");
        return [key, value];
      }));
      if (!parts.ts || !parts.v1) throw new Error("REST_MP_WEBHOOK_SIGNATURE_INVALID");
      const now = repository.now?.() ?? new Date();
      if (Math.abs(now.getTime() - Number(parts.ts) * 1_000) > 5 * 60_000) {
        throw new Error("REST_MP_WEBHOOK_STALE");
      }
      const expected = createHmac("sha256", input.secret).update(
        mercadoPagoSignatureManifest({
          dataId: input.dataId,
          requestId: input.requestId,
          timestamp: parts.ts,
        }),
      ).digest();
      const received = Buffer.from(parts.v1, "hex");
      if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
        throw new Error("REST_MP_WEBHOOK_SIGNATURE_INVALID");
      }
      const prior = await repository.findEvent(input.globalTenantId, input.requestId);
      if (prior) return prior;
      const result = await repository.reconcile(input.globalTenantId, input.dataId);
      await repository.saveEvent({
        globalTenantId: input.globalTenantId,
        requestId: input.requestId,
        providerOrderId: input.dataId,
        result,
      });
      return result;
    },
  };
}

