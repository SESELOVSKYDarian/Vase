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

type MercadoPagoOrder = {
  id: string;
  status: string;
  status_detail?: string;
  type_response?: { qr_data?: string };
  transactions?: {
    payments?: Array<{ id: string; amount: string; status: string }>;
  };
};

type MercadoPagoOperationalRepository = {
  findAttempt(globalTenantId: string, commandId: string): Promise<{
    id: string;
    status: string;
    providerOrderId: string | null;
    result?: unknown;
  } | null>;
  prepareAttempt(input: {
    globalTenantId: string;
    branchId: string;
    orderId: string;
    kind: "POINT" | "QR";
    commandId: string;
    actorId: string;
  }): Promise<{
    attemptId: string;
    accessToken: string;
    amount: string;
    externalReference: string;
    description: string;
    config: {
      terminalId?: string;
      externalPosId?: string;
      qrMode?: "dynamic" | "hybrid" | "static";
    };
  }>;
  markProviderState(attemptId: string, state: {
    status: string;
    providerOrderId?: string;
    providerPaymentId?: string;
    response?: unknown;
    error?: string;
  }): Promise<unknown>;
  finalizeProcessed(attemptId: string, provider: {
    orderId: string;
    paymentId: string;
    amount: string;
    response: unknown;
  }): Promise<unknown>;
  clientFactory(accessToken: string): {
    createPointOrder(input: {
      idempotencyKey: string;
      externalReference: string;
      amount: string;
      terminalId: string;
      description: string;
    }): Promise<MercadoPagoOrder>;
    createQrOrder(input: {
      idempotencyKey: string;
      externalReference: string;
      amount: string;
      mode: "dynamic" | "hybrid" | "static";
      externalPosId?: string;
      description: string;
    }): Promise<MercadoPagoOrder>;
    getOrder(orderId: string): Promise<MercadoPagoOrder>;
  };
};

export function createMercadoPagoPaymentService(
  repository: MercadoPagoOperationalRepository,
) {
  async function settle(attemptId: string, provider: MercadoPagoOrder) {
    const payment = provider.transactions?.payments?.find((item) =>
      item.status === "processed" || item.status === "approved");
    await repository.markProviderState(attemptId, {
      status: provider.status,
      providerOrderId: provider.id,
      providerPaymentId: payment?.id,
      response: provider,
    });
    if (provider.status !== "processed" || !payment) {
      return {
        attemptId,
        providerOrderId: provider.id,
        status: provider.status,
        qrData: provider.type_response?.qr_data,
      };
    }
    return repository.finalizeProcessed(attemptId, {
      orderId: provider.id,
      paymentId: payment.id,
      amount: payment.amount,
      response: provider,
    });
  }
  return {
    async create(raw: unknown) {
      const input = z.object({
        globalTenantId: z.string().min(1),
        branchId: z.string().min(1),
        orderId: z.string().min(1),
        kind: z.enum(["POINT", "QR"]),
        commandId: z.string().min(1),
        actorId: z.string().min(1),
      }).strict().parse(raw);
      const existing = await repository.findAttempt(
        input.globalTenantId,
        input.commandId,
      );
      if (existing?.status === "APPLIED" && existing.result) return existing.result;
      const prepared = await repository.prepareAttempt(input);
      const client = repository.clientFactory(prepared.accessToken);
      if (existing?.providerOrderId) {
        return settle(prepared.attemptId, await client.getOrder(existing.providerOrderId));
      }
      try {
        const provider = input.kind === "POINT"
          ? await client.createPointOrder({
              idempotencyKey: input.commandId,
              externalReference: prepared.externalReference,
              amount: prepared.amount,
              terminalId: prepared.config.terminalId ??
                (() => { throw new Error("REST_MP_TERMINAL_REQUIRED"); })(),
              description: prepared.description,
            })
          : await client.createQrOrder({
              idempotencyKey: input.commandId,
              externalReference: prepared.externalReference,
              amount: prepared.amount,
              mode: prepared.config.qrMode ?? "dynamic",
              externalPosId: prepared.config.externalPosId,
              description: prepared.description,
            });
        return settle(prepared.attemptId, provider);
      } catch (error) {
        const code = error instanceof Error ? error.message : "REST_MP_PROVIDER_FAILED";
        await repository.markProviderState(prepared.attemptId, {
          status: code === "REST_MP_RESPONSE_AMBIGUOUS" ? "AMBIGUOUS" : "FAILED",
          error: code,
        });
        throw error;
      }
    },
  };
}
