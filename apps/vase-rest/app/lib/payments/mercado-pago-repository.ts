import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "../db";
import { decryptSecret } from "../secrets/encryption";
import { readSecretKeyring } from "../secrets/keyring";
import { createMercadoPagoClient } from "./mercado-pago-client";
import { allowedPromotionTenderTypes } from "../promotions/promotion-tender-policy";

function inputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

const configSchema = z.object({
  terminalId: z.string().nullable().optional(),
  externalPosId: z.string().nullable().optional(),
  qrMode: z.enum(["dynamic", "hybrid", "static"]).optional(),
}).passthrough();

function accessToken(connection: {
  globalTenantId: string;
  branchId: string;
  accessTokenCiphertext: string | null;
}) {
  if (!connection.accessTokenCiphertext) throw new Error("REST_MP_CONNECTION_INACTIVE");
  return decryptSecret({
    ciphertext: connection.accessTokenCiphertext,
    context: `${connection.globalTenantId}:${connection.branchId}:mercado-pago:access`,
    keys: readSecretKeyring().keys,
  });
}

export const prismaMercadoPagoOperationalRepository = {
  async findAttempt(globalTenantId: string, commandId: string) {
    const attempt = await db.providerPaymentAttempt.findUnique({
      where: { globalTenantId_commandId: { globalTenantId, commandId } },
    });
    return attempt ? {
      id: attempt.id,
      status: attempt.status,
      providerOrderId: attempt.providerOrderId,
      result: attempt.result,
    } : null;
  },
  async prepareAttempt(input: {
    globalTenantId: string;
    branchId: string;
    orderId: string;
    kind: "POINT" | "QR";
    commandId: string;
    actorId: string;
  }) {
    const data = await db.$transaction(async (tx) => {
      const connection = await tx.paymentProviderConnection.findFirst({
        where: {
          globalTenantId: input.globalTenantId,
          branchId: input.branchId,
          provider: "MERCADO_PAGO",
          status: { in: ["SANDBOX", "ACTIVE"] },
        },
      });
      if (!connection) throw new Error("REST_MP_CONNECTION_INACTIVE");
      const order = await tx.restaurantOrder.findFirst({
        where: {
          id: input.orderId,
          globalTenantId: input.globalTenantId,
          branchId: input.branchId,
          status: { notIn: ["CANCELLED", "PAID"] },
        },
        include: {
          payments: { where: { status: "APPLIED" }, select: { amount: true } },
          items: {
            where: { status: { not: "CANCELLED" } },
            select: { promotionIds: true },
          },
        },
      });
      if (!order) throw new Error("REST_MP_ORDER_INVALID");
      const promotionIds = [...new Set(order.items.flatMap((item) =>
        Array.isArray(item.promotionIds) ? item.promotionIds.map(String) : []))];
      const promotionTenderTypes = allowedPromotionTenderTypes({
        promotionIds,
        promotions: promotionIds.length ? await tx.promotion.findMany({
          where: {
            id: { in: promotionIds },
            globalTenantId: order.globalTenantId,
          },
          select: { id: true, paymentMethods: true },
        }) : [],
      });
      if (
        promotionTenderTypes &&
        !promotionTenderTypes.includes("MERCADO_PAGO")
      ) throw new Error("REST_PROMOTION_TENDER_MISMATCH");
      const paid = order.payments.reduce(
        (sum, payment) => sum.add(payment.amount),
        new Prisma.Decimal(0),
      );
      const amount = order.total.sub(paid);
      if (amount.lessThanOrEqualTo(0)) throw new Error("REST_MP_ORDER_ALREADY_PAID");
      const existing = await tx.providerPaymentAttempt.findUnique({
        where: {
          globalTenantId_commandId: {
            globalTenantId: input.globalTenantId,
            commandId: input.commandId,
          },
        },
      });
      if (
        existing &&
        (existing.orderId !== order.id ||
          existing.branchId !== input.branchId ||
          existing.kind !== input.kind)
      ) throw new Error("REST_MP_IDEMPOTENCY_CONFLICT");
      const attempt = existing ?? await tx.providerPaymentAttempt.create({
        data: {
          restTenantId: connection.restTenantId,
          globalTenantId: input.globalTenantId,
          branchId: input.branchId,
          orderId: order.id,
          connectionId: connection.id,
          kind: input.kind,
          amount,
          commandId: input.commandId,
          actorId: input.actorId,
        },
      });
      return { connection, order, attempt };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    const config = configSchema.parse(data.connection.config);
    return {
      attemptId: data.attempt.id,
      accessToken: accessToken(data.connection),
      amount: data.attempt.amount.toFixed(2),
      externalReference: data.order.id,
      description: `Orden ${data.order.orderNumber}`,
      config: {
        terminalId: config.terminalId ?? undefined,
        externalPosId: config.externalPosId ?? undefined,
        qrMode: config.qrMode,
      },
    };
  },
  async markProviderState(attemptId: string, state: {
    status: string;
    providerOrderId?: string;
    providerPaymentId?: string;
    response?: unknown;
    error?: string;
  }) {
    return db.providerPaymentAttempt.update({
      where: { id: attemptId },
      data: {
        status: state.status,
        providerOrderId: state.providerOrderId,
        providerPaymentId: state.providerPaymentId,
        response: state.response === undefined ? undefined : inputJson(state.response),
        lastError: state.error ?? null,
        lastReconciledAt: new Date(),
      },
    });
  },
  async finalizeProcessed(attemptId: string, provider: {
    orderId: string;
    paymentId: string;
    amount: string;
    response: unknown;
  }) {
    return db.$transaction(async (tx) => {
      const attempt = await tx.providerPaymentAttempt.findUniqueOrThrow({
        where: { id: attemptId },
        include: { order: true, connection: true },
      });
      if (attempt.status === "APPLIED" && attempt.result) return attempt.result;
      const providerAmount = new Prisma.Decimal(provider.amount);
      if (!providerAmount.equals(attempt.amount)) throw new Error("REST_MP_AMOUNT_MISMATCH");
      if (provider.orderId !== attempt.providerOrderId) {
        throw new Error("REST_MP_PROVIDER_ORDER_MISMATCH");
      }
      const existing = await tx.payment.findUnique({
        where: {
          globalTenantId_provider_reference: {
            globalTenantId: attempt.globalTenantId,
            provider: "MERCADO_PAGO",
            reference: provider.paymentId,
          },
        },
      });
      const payment = existing ?? await tx.payment.create({
        data: {
          restTenantId: attempt.restTenantId,
          globalTenantId: attempt.globalTenantId,
          branchId: attempt.branchId,
          orderId: attempt.orderId,
          tenderType: "MERCADO_PAGO",
          amount: attempt.amount,
          provider: "MERCADO_PAGO",
          reference: provider.paymentId,
          operator: attempt.kind,
          actorId: attempt.actorId,
          commandId: `${attempt.commandId}:provider`,
        },
      });
      await tx.restaurantOrder.update({
        where: { id: attempt.orderId },
        data: { status: "PAID", revision: { increment: 1 } },
      });
      const result = {
        paymentId: payment.id,
        status: payment.status,
        providerOrderId: provider.orderId,
        providerPaymentId: provider.paymentId,
        amount: payment.amount.toFixed(2),
      };
      await tx.providerPaymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "APPLIED",
          providerPaymentId: provider.paymentId,
          response: inputJson(provider.response),
          result: inputJson(result),
          lastError: null,
          lastReconciledAt: new Date(),
        },
      });
      return result;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },
  clientFactory(accessTokenValue: string) {
    return createMercadoPagoClient({ accessToken: accessTokenValue });
  },
};
