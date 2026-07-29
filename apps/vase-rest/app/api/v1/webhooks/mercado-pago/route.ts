import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/secrets/encryption";
import { readSecretKeyring } from "@/lib/secrets/keyring";
import {
  createMercadoPagoPaymentService,
  createMercadoPagoWebhookService,
} from "@/lib/payments/mercado-pago-service";
import { prismaMercadoPagoOperationalRepository } from "@/lib/payments/mercado-pago-repository";

function inputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  try {
    const connectionId = url.searchParams.get("connection") ?? "";
    const dataId = url.searchParams.get("data.id") ?? "";
    const connection = await db.paymentProviderConnection.findUnique({
      where: { id: connectionId },
    });
    if (
      !connection ||
      connection.provider !== "MERCADO_PAGO" ||
      !connection.webhookSecretCiphertext
    ) throw new Error("REST_MP_WEBHOOK_CONNECTION_INVALID");
    const secret = decryptSecret({
      ciphertext: connection.webhookSecretCiphertext,
      context: `${connection.globalTenantId}:${connection.branchId}:mercado-pago:webhook`,
      keys: readSecretKeyring().keys,
    });
    const paymentService = createMercadoPagoPaymentService(
      prismaMercadoPagoOperationalRepository,
    );
    const service = createMercadoPagoWebhookService({
      findEvent: async (_tenant, requestId) => (
        await db.paymentProviderWebhookEvent.findUnique({
          where: { connectionId_requestId: { connectionId, requestId } },
        })
      )?.result ?? null,
      reconcile: async (_tenant, providerOrderId) => {
        const attempt = await db.providerPaymentAttempt.findFirst({
          where: {
            connectionId,
            providerOrderId,
          },
        });
        if (!attempt) throw new Error("REST_MP_ATTEMPT_NOT_FOUND");
        return paymentService.create({
          globalTenantId: attempt.globalTenantId,
          branchId: attempt.branchId,
          orderId: attempt.orderId,
          kind: attempt.kind,
          commandId: attempt.commandId,
          actorId: attempt.actorId,
        });
      },
      saveEvent: async (event) => db.paymentProviderWebhookEvent.create({
        data: {
          restTenantId: connection.restTenantId,
          globalTenantId: connection.globalTenantId,
          connectionId,
          requestId: String(event.requestId),
          providerOrderId: String(event.providerOrderId),
          result: inputJson(event.result),
        },
      }),
    });
    const result = await service.accept({
      globalTenantId: connection.globalTenantId,
      dataId,
      requestId: request.headers.get("x-request-id") ?? "",
      xSignature: request.headers.get("x-signature") ?? "",
      secret,
    });
    return NextResponse.json({ received: true, result });
  } catch (error) {
    const code = error instanceof Error ? error.message : "REST_MP_WEBHOOK_FAILED";
    return NextResponse.json({ error: code }, {
      status: code.includes("SIGNATURE") || code.includes("STALE") ? 401
        : code.includes("NOT_FOUND") ? 404 : 400,
    });
  }
}

