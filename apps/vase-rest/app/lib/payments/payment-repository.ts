import { Prisma } from "@prisma/client";
import { db } from "../db";
import type { PaymentRepository } from "./payment-service";
import { allowedPromotionTenderTypes } from "../promotions/promotion-tender-policy";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export const prismaPaymentRepository: PaymentRepository = {
  async findReceipt(globalTenantId, commandId) {
    return (await db.financialCommandReceipt.findUnique({
      where: { globalTenantId_commandId: { globalTenantId, commandId } },
    }))?.response ?? null;
  },
  async getOrder(globalTenantId, branchId, orderId) {
    const order = await db.restaurantOrder.findFirst({
      where: { id: orderId, globalTenantId, branchId },
      include: {
        payments: {
          where: { status: "APPLIED" },
          select: { amount: true },
        },
        items: {
          where: { status: { not: "CANCELLED" } },
          select: { promotionIds: true },
        },
      },
    });
    if (!order) return null;
    const paid = order.payments.reduce(
      (total, payment) => total.add(payment.amount),
      new Prisma.Decimal(0),
    );
    const promotionIds = [...new Set(order.items.flatMap((item) =>
      Array.isArray(item.promotionIds) ? item.promotionIds.map(String) : []))];
    const promotions = promotionIds.length
      ? await db.promotion.findMany({
          where: {
            id: { in: promotionIds },
            globalTenantId,
          },
          select: { id: true, paymentMethods: true },
        })
      : [];
    const promotionTenderTypes = allowedPromotionTenderTypes({
      promotionIds,
      promotions,
    });
    return {
      id: order.id,
      globalTenantId: order.globalTenantId,
      branchId: order.branchId,
      status: order.status,
      total: order.total.toFixed(2),
      paidTotal: paid.toFixed(2),
      allowedPromotionTenderTypes: promotionTenderTypes,
    };
  },
  getOpenDrawer(globalTenantId, branchId) {
    return db.cashDrawer.findFirst({
      where: { globalTenantId, branchId, status: "OPEN" },
      orderBy: { openedAt: "desc" },
      select: { id: true },
    });
  },
  async execute(input) {
    return db.$transaction(async (tx) => {
      const tenant = await tx.restTenant.findUniqueOrThrow({
        where: { globalTenantId: String(input.globalTenantId) },
        select: { id: true },
      });
      const order = await tx.restaurantOrder.findFirstOrThrow({
        where: {
          id: String(input.orderId),
          globalTenantId: String(input.globalTenantId),
          branchId: String(input.branchId),
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
      const paid = order.payments.reduce(
        (total, payment) => total.add(payment.amount),
        new Prisma.Decimal(0),
      );
      const amount = new Prisma.Decimal(String(input.amount));
      const remaining = order.total.sub(paid);
      if (amount.greaterThan(remaining)) throw new Error("REST_PAYMENT_EXCEEDS_BALANCE");
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
        !promotionTenderTypes.includes(String(input.tenderType))
      ) throw new Error("REST_PROMOTION_TENDER_MISMATCH");
      const drawerId = input.drawerId ? String(input.drawerId) : null;
      const customerAccountId = input.customerAccountId
        ? String(input.customerAccountId) : null;
      const account = customerAccountId
        ? await tx.customerAccount.findFirstOrThrow({
            where: {
              id: customerAccountId,
              globalTenantId: order.globalTenantId,
              status: "ACTIVE",
            },
            include: { movements: { select: { amount: true } } },
          })
        : null;
      if (String(input.tenderType) === "CUSTOMER_ACCOUNT" && !account) {
        throw new Error("REST_CUSTOMER_ACCOUNT_REQUIRED");
      }
      if (String(input.tenderType) !== "CUSTOMER_ACCOUNT" && account) {
        throw new Error("REST_CUSTOMER_ACCOUNT_TENDER_MISMATCH");
      }
      if (account?.creditLimit) {
        const balance = account.movements.reduce(
          (sum, movement) => sum.add(movement.amount),
          new Prisma.Decimal(0),
        );
        if (balance.add(amount).greaterThan(account.creditLimit)) {
          throw new Error("REST_ACCOUNT_CREDIT_LIMIT_EXCEEDED");
        }
      }
      const payment = await tx.payment.create({
        data: {
          restTenantId: tenant.id,
          globalTenantId: order.globalTenantId,
          branchId: order.branchId,
          orderId: order.id,
          drawerId,
          tenderType: String(input.tenderType),
          amount,
          provider: input.provider ? String(input.provider) : null,
          reference: input.reference ? String(input.reference) : null,
          operator: input.operator ? String(input.operator) : null,
          actorId: String(input.actorId),
          commandId: String(input.commandId),
          customerAccountId,
        },
      });
      if (account) {
        const balance = account.movements.reduce(
          (sum, movement) => sum.add(movement.amount),
          new Prisma.Decimal(0),
        );
        await tx.customerAccountMovement.create({
          data: {
            restTenantId: account.restTenantId,
            globalTenantId: account.globalTenantId,
            branchId: order.branchId,
            accountId: account.id,
            paymentId: payment.id,
            type: "CHARGE",
            amount,
            balanceAfter: balance.add(amount),
            reason: `Consumo orden #${order.orderNumber}`,
            actorId: String(input.actorId),
            commandId: `${String(input.commandId)}:account`,
          },
        });
      }
      if (drawerId) {
        const drawer = await tx.cashDrawer.findFirstOrThrow({
          where: {
            id: drawerId,
            globalTenantId: order.globalTenantId,
            branchId: order.branchId,
            status: "OPEN",
          },
        });
        const balanceAfter = drawer.expectedCash.add(amount);
        await tx.cashMovement.create({
          data: {
            restTenantId: tenant.id,
            globalTenantId: order.globalTenantId,
            branchId: order.branchId,
            drawerId,
            paymentId: payment.id,
            type: "SALE",
            amount,
            balanceAfter,
            reason: `Cobro orden #${order.orderNumber}`,
            actorId: String(input.actorId),
            commandId: `${String(input.commandId)}:cash`,
          },
        });
        await tx.cashDrawer.update({
          where: { id: drawerId },
          data: { expectedCash: balanceAfter, revision: { increment: 1 } },
        });
      }
      const remainingAfter = remaining.sub(amount);
      if (remainingAfter.equals(0)) {
        await tx.restaurantOrder.update({
          where: { id: order.id },
          data: { status: "PAID", revision: { increment: 1 } },
        });
      }
      const response = {
        id: payment.id,
        orderId: order.id,
        status: payment.status,
        amount: payment.amount.toFixed(2),
        remainingAfter: remainingAfter.toFixed(2),
      };
      await tx.financialCommandReceipt.create({
        data: {
          restTenantId: tenant.id,
          globalTenantId: order.globalTenantId,
          commandId: String(input.commandId),
          response: json(response),
        },
      });
      return response;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },
};
