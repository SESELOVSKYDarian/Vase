import { describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
} from "../apps/vase-rest/app/lib/secrets/encryption";
import { createMercadoPagoClient } from "../apps/vase-rest/app/lib/payments/mercado-pago-client";
import { createMercadoPagoPaymentService } from "../apps/vase-rest/app/lib/payments/mercado-pago-service";

describe("Rest Mercado Pago integration", () => {
  it("encrypts tenant-bound credentials with versioned AES-256-GCM", () => {
    const key = Buffer.alloc(32, 7).toString("base64");
    const encrypted = encryptSecret({
      plaintext: "APP_USR-secret",
      context: "tenant_1:branch_1:mercado-pago",
      keyVersion: "v1",
      key,
    });
    expect(encrypted).not.toContain("APP_USR-secret");
    expect(decryptSecret({
      ciphertext: encrypted,
      context: "tenant_1:branch_1:mercado-pago",
      keys: { v1: key },
    })).toBe("APP_USR-secret");
    expect(() => decryptSecret({
      ciphertext: encrypted,
      context: "tenant_other:branch_1:mercado-pago",
      keys: { v1: key },
    })).toThrow("REST_SECRET_DECRYPT_FAILED");
  });

  it("creates Point and QR orders through the unified Orders API with idempotency", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const client = createMercadoPagoClient({
      accessToken: "APP_USR-token",
      fetcher: async (url, init) => {
        requests.push({ url: String(url), init });
        return Response.json({
          id: "ORD0001",
          status: "created",
          type_response: { qr_data: "000201..." },
        }, { status: 201 });
      },
    });
    await client.createPointOrder({
      idempotencyKey: "cmd-point",
      externalReference: "order_42",
      amount: "1500.00",
      terminalId: "NEWLAND_N950__SBX0000001",
      description: "Orden 42",
    });
    await client.createQrOrder({
      idempotencyKey: "cmd-qr",
      externalReference: "order_43",
      amount: "850.50",
      mode: "dynamic",
      description: "Orden 43",
    });
    expect(requests.map((request) => request.url)).toEqual([
      "https://api.mercadopago.com/v1/orders",
      "https://api.mercadopago.com/v1/orders",
    ]);
    expect(requests[0].init?.headers).toMatchObject({
      Authorization: "Bearer APP_USR-token",
      "X-Idempotency-Key": "cmd-point",
    });
    expect(JSON.parse(String(requests[0].init?.body))).toMatchObject({
      type: "point",
      config: { point: { terminal_id: "NEWLAND_N950__SBX0000001" } },
    });
    expect(JSON.parse(String(requests[1].init?.body))).toMatchObject({
      type: "qr",
      config: { qr: { mode: "dynamic" } },
    });
  });

  it("queries provider state before resolving an ambiguous response", async () => {
    const client = createMercadoPagoClient({
      accessToken: "token",
      fetcher: async (url) => Response.json({
        id: String(url).split("/").at(-1),
        status: "processed",
        transactions: { payments: [{ id: "PAY1", amount: "100.00", status: "processed" }] },
      }),
    });
    await expect(client.getOrder("ORD-ambiguous")).resolves.toMatchObject({
      id: "ORD-ambiguous",
      status: "processed",
    });
  });

  it("persists an attempt before calling Point and finalizes only from provider processed state", async () => {
    const transitions: string[] = [];
    const service = createMercadoPagoPaymentService({
      findAttempt: async () => null,
      prepareAttempt: async () => ({
        attemptId: "attempt_1",
        accessToken: "token",
        amount: "100.00",
        externalReference: "order_1",
        description: "Orden 1",
        config: { terminalId: "terminal_1" },
      }),
      markProviderState: async (_id, state) => { transitions.push(state.status); },
      finalizeProcessed: async () => {
        transitions.push("FINALIZED");
        return { paymentId: "payment_1", status: "APPLIED" };
      },
      clientFactory: () => ({
        createPointOrder: async () => ({
          id: "ORD1", status: "processed",
          transactions: { payments: [{ id: "PAY1", amount: "100.00", status: "processed" }] },
        }),
        createQrOrder: async () => { throw new Error("unexpected"); },
        getOrder: async () => { throw new Error("unexpected"); },
      }),
    });
    await expect(service.create({
      globalTenantId: "tenant_1", branchId: "branch_1", orderId: "order_1",
      kind: "POINT", commandId: "command_1", actorId: "cashier_1",
    })).resolves.toEqual({ paymentId: "payment_1", status: "APPLIED" });
    expect(transitions).toEqual(["processed", "FINALIZED"]);
  });

  it("keeps ambiguous attempts unresolved and retries with the same provider idempotency key", async () => {
    const keys: string[] = [];
    const markProviderState = async () => undefined;
    const service = createMercadoPagoPaymentService({
      findAttempt: async () => ({
        id: "attempt_1", status: "AMBIGUOUS", providerOrderId: null,
      }),
      prepareAttempt: async () => ({
        attemptId: "attempt_1", accessToken: "token", amount: "100.00",
        externalReference: "order_1", description: "Orden 1",
        config: { terminalId: "terminal_1" },
      }),
      markProviderState,
      finalizeProcessed: async () => { throw new Error("unexpected"); },
      clientFactory: () => ({
        createPointOrder: async (input) => {
          keys.push(input.idempotencyKey);
          throw new Error("REST_MP_RESPONSE_AMBIGUOUS");
        },
        createQrOrder: async () => { throw new Error("unexpected"); },
        getOrder: async () => { throw new Error("unexpected"); },
      }),
    });
    await expect(service.create({
      globalTenantId: "tenant_1", branchId: "branch_1", orderId: "order_1",
      kind: "POINT", commandId: "command_1", actorId: "cashier_1",
    })).rejects.toThrow("REST_MP_RESPONSE_AMBIGUOUS");
    expect(keys).toEqual(["command_1"]);
  });
});
