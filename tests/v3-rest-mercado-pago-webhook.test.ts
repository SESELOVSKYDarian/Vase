import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  createMercadoPagoWebhookService,
  mercadoPagoSignatureManifest,
} from "../apps/vase-rest/app/lib/payments/mercado-pago-service";

describe("Rest Mercado Pago webhooks", () => {
  it("verifies the official HMAC manifest and processes each provider event once", async () => {
    const secret = "webhook-secret";
    const manifest = mercadoPagoSignatureManifest({
      dataId: "ORD0001",
      requestId: "request-1",
      timestamp: "1704908010",
    });
    const signature = createHmac("sha256", secret).update(manifest).digest("hex");
    const reconcile = vi.fn(async () => ({ status: "processed" }));
    const service = createMercadoPagoWebhookService({
      findEvent: async () => null,
      saveEvent: async (event) => event,
      reconcile,
      now: () => new Date(1704908010 * 1000),
    });
    await expect(service.accept({
      globalTenantId: "tenant_1",
      dataId: "ORD0001",
      requestId: "request-1",
      xSignature: `ts=1704908010,v1=${signature}`,
      secret,
    })).resolves.toMatchObject({ status: "processed" });
    expect(reconcile).toHaveBeenCalledOnce();
  });

  it("rejects invalid or stale signatures and returns the stored result for a replay", async () => {
    const replaySecret = "secret";
    const replaySignature = createHmac("sha256", replaySecret).update(
      mercadoPagoSignatureManifest({
        dataId: "ORD0001",
        requestId: "replayed",
        timestamp: "1704908010",
      }),
    ).digest("hex");
    const service = createMercadoPagoWebhookService({
      findEvent: async (_tenant, requestId) =>
        requestId === "replayed" ? { status: "processed" } : null,
      saveEvent: vi.fn(),
      reconcile: vi.fn(),
      now: () => new Date(1704908010 * 1000),
    });
    await expect(service.accept({
      globalTenantId: "tenant_1",
      dataId: "ORD0001",
      requestId: "replayed",
      xSignature: `ts=1704908010,v1=${replaySignature}`,
      secret: replaySecret,
    })).resolves.toEqual({ status: "processed" });
    await expect(service.accept({
      globalTenantId: "tenant_1",
      dataId: "ORD0001",
      requestId: "new",
      xSignature: "ts=1704900000,v1=bad",
      secret: "secret",
    })).rejects.toThrow("REST_MP_WEBHOOK_STALE");
  });
});
