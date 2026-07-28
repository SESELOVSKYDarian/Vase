import { Prisma } from "@prisma/client";
import { db } from "../db";
import { decryptSecret } from "../secrets/encryption";
import { readSecretKeyring } from "../secrets/keyring";
import { createMercadoPagoClient } from "./mercado-pago-client";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export const prismaRefundRepository = {
  async findRefund(globalTenantId: string, commandId: string) {
    const refund = await db.paymentRefund.findUnique({
      where: { globalTenantId_commandId: { globalTenantId, commandId } },
    });
    return refund && refund.status !== "PENDING" ? refund : null;
  },

  async prepare(input: Record<string, unknown>) {
    return db.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: {
          id: String(input.paymentId),
          globalTenantId: String(input.globalTenantId),
          branchId: String(input.branchId),
          status: { in: ["APPLIED", "PARTIALLY_REFUNDED"] },
        },
        include: {
          refunds: {
            where: {
              status: { in: ["PENDING", "PROCESSING", "AMBIGUOUS", "APPLIED"] },
            },
            select: { amount: true },
          },
        },
      });
      if (!payment) throw new Error("REST_REFUND_PAYMENT_NOT_FOUND");
      const alreadyRefunded = payment.refunds.reduce(
        (sum, refund) => sum.add(refund.amount),
        new Prisma.Decimal(0),
      );
      const existing = await tx.paymentRefund.findUnique({
        where: {
          globalTenantId_commandId: {
            globalTenantId: payment.globalTenantId,
            commandId: String(input.commandId),
          },
        },
      });
      if (
        existing &&
        (existing.paymentId !== payment.id ||
          !existing.amount.equals(new Prisma.Decimal(String(input.amount))))
      ) throw new Error("REST_REFUND_IDEMPOTENCY_CONFLICT");
      const attempt = payment.provider === "MERCADO_PAGO"
        ? await tx.providerPaymentAttempt.findFirst({
            where: {
              globalTenantId: payment.globalTenantId,
              branchId: payment.branchId,
              providerPaymentId: payment.reference,
              status: "APPLIED",
            },
          })
        : null;
      if (payment.provider === "MERCADO_PAGO" && !attempt) {
        throw new Error("REST_REFUND_PROVIDER_LINK_MISSING");
      }
      const refund = existing ?? await tx.paymentRefund.create({
        data: {
          restTenantId: payment.restTenantId,
          globalTenantId: payment.globalTenantId,
          branchId: payment.branchId,
          paymentId: payment.id,
          amount: new Prisma.Decimal(String(input.amount)),
          provider: payment.provider,
          reason: String(input.reason),
          commandId: String(input.commandId),
          actorId: String(input.actorId),
        },
      });
      return {
        refundId: refund.id,
        paymentId: payment.id,
        tenderType: payment.provider === "MERCADO_PAGO"
          ? "MERCADO_PAGO" : payment.tenderType,
        paymentAmount: payment.amount.toFixed(2),
        alreadyRefunded: alreadyRefunded.toFixed(2),
        providerOrderId: attempt?.providerOrderId ?? undefined,
        providerPaymentId: attempt?.providerPaymentId ?? undefined,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },

  async providerRefund(
    prepared: {
      refundId: string;
      providerOrderId?: string;
      providerPaymentId?: string;
    },
    input: { amount: string; commandId: string; full: boolean },
  ) {
    const refund = await db.paymentRefund.findUniqueOrThrow({
      where: { id: prepared.refundId },
    });
    const attempt = await db.providerPaymentAttempt.findFirstOrThrow({
      where: {
        globalTenantId: refund.globalTenantId,
        providerOrderId: prepared.providerOrderId,
        providerPaymentId: prepared.providerPaymentId,
        status: "APPLIED",
      },
      include: { connection: true },
    });
    if (!attempt.connection.accessTokenCiphertext) {
      throw new Error("REST_MP_CONNECTION_INACTIVE");
    }
    const accessToken = decryptSecret({
      ciphertext: attempt.connection.accessTokenCiphertext,
      context: `${refund.globalTenantId}:${refund.branchId}:mercado-pago:access`,
      keys: readSecretKeyring().keys,
    });
    const response = await createMercadoPagoClient({ accessToken }).refundOrder(
      attempt.providerOrderId!,
      input.commandId,
      input.full ? undefined : {
        transactions: [{
          id: attempt.providerPaymentId,
          amount: input.amount,
        }],
      },
    );
    const providerRefund = response.transactions?.refunds?.find((item) =>
      item.transaction_id === attempt.providerPaymentId &&
      new Prisma.Decimal(item.amount).equals(new Prisma.Decimal(input.amount)));
    if (!providerRefund) throw new Error("REST_REFUND_PROVIDER_MISMATCH");
    return {
      orderId: response.id,
      refundId: providerRefund.id,
      transactionId: providerRefund.transaction_id,
      amount: providerRefund.amount,
      status: providerRefund.status,
      response,
    };
  },

  markState(refundId: string, state: Record<string, unknown>) {
    return db.paymentRefund.update({
      where: { id: refundId },
      data: {
        status: String(state.status),
        providerRefundId: state.providerRefundId
          ? String(state.providerRefundId) : undefined,
        providerResponse: state.providerResponse === undefined
          ? undefined : json(state.providerResponse),
      },
    });
  },

  async finalize(refundId: string, state: Record<string, unknown>) {
    return db.$transaction(async (tx) => {
      const refund = await tx.paymentRefund.findUniqueOrThrow({
        where: { id: refundId },
        include: {
          payment: {
            include: {
              refunds: {
                where: { status: "APPLIED" },
                select: { amount: true },
              },
              customerAccount: {
                include: { movements: { select: { amount: true } } },
              },
              order: true,
            },
          },
        },
      });
      if (refund.status === "APPLIED") return refund;
      if (refund.payment.tenderType === "CASH") {
        const drawer = await tx.cashDrawer.findFirst({
          where: {
            globalTenantId: refund.globalTenantId,
            branchId: refund.branchId,
            status: "OPEN",
          },
          orderBy: { openedAt: "desc" },
        });
        if (!drawer) throw new Error("REST_CASH_DRAWER_REQUIRED");
        const balanceAfter = drawer.expectedCash.sub(refund.amount);
        await tx.cashMovement.create({
          data: {
            restTenantId: refund.restTenantId,
            globalTenantId: refund.globalTenantId,
            branchId: refund.branchId,
            drawerId: drawer.id,
            type: "REFUND",
            amount: refund.amount.negated(),
            balanceAfter,
            reason: refund.reason,
            actorId: refund.actorId,
            commandId: `${refund.commandId}:cash`,
          },
        });
        await tx.cashDrawer.update({
          where: { id: drawer.id },
          data: { expectedCash: balanceAfter, revision: { increment: 1 } },
        });
      }
      const account = refund.payment.customerAccount;
      if (account) {
        const balance = account.movements.reduce(
          (sum, movement) => sum.add(movement.amount),
          new Prisma.Decimal(0),
        );
        await tx.customerAccountMovement.create({
          data: {
            restTenantId: refund.restTenantId,
            globalTenantId: refund.globalTenantId,
            branchId: refund.branchId,
            accountId: account.id,
            paymentId: refund.paymentId,
            type: "REFUND",
            amount: refund.amount.negated(),
            balanceAfter: balance.sub(refund.amount),
            reason: refund.reason,
            actorId: refund.actorId,
            commandId: `${refund.commandId}:account`,
          },
        });
      }
      const totalRefunded = refund.payment.refunds.reduce(
        (sum, item) => sum.add(item.amount),
        refund.amount,
      );
      const complete = totalRefunded.equals(refund.payment.amount);
      await tx.payment.update({
        where: { id: refund.paymentId },
        data: { status: complete ? "REFUNDED" : "PARTIALLY_REFUNDED" },
      });
      await tx.restaurantOrder.update({
        where: { id: refund.payment.order.id },
        data: {
          status: complete ? "REFUNDED" : "PARTIALLY_REFUNDED",
          revision: { increment: 1 },
        },
      });
      return tx.paymentRefund.update({
        where: { id: refund.id },
        data: {
          status: String(state.status),
          providerRefundId: state.providerRefundId
            ? String(state.providerRefundId) : undefined,
          providerResponse: state.providerResponse === undefined
            ? undefined : json(state.providerResponse),
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },
};
