import { Prisma } from "@prisma/client";
import { db } from "../db";
import type { CustomerAccountRepository } from "./customer-account-service";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export const prismaCustomerAccountRepository: CustomerAccountRepository = {
  async findReceipt(globalTenantId, commandId) {
    return (await db.financialCommandReceipt.findUnique({
      where: { globalTenantId_commandId: { globalTenantId, commandId } },
    }))?.response ?? null;
  },
  async getAccount(globalTenantId, accountId) {
    const value = await db.customerAccount.findFirst({
      where: { id: accountId, globalTenantId },
      include: { movements: { select: { amount: true } } },
    });
    if (!value) return null;
    const balance = value.movements.reduce(
      (sum, movement) => sum.add(movement.amount),
      new Prisma.Decimal(0),
    );
    return {
      id: value.id,
      globalTenantId: value.globalTenantId,
      status: value.status,
      balance: balance.toFixed(2),
      creditLimit: value.creditLimit?.toFixed(2) ?? null,
    };
  },
  async getMovement(globalTenantId, movementId) {
    const movement = await db.customerAccountMovement.findFirst({
      where: { id: movementId, globalTenantId },
    });
    if (!movement) return null;
    const reversal = await db.customerAccountMovement.findFirst({
      where: { reversalOfId: movement.id },
      select: { id: true },
    });
    return {
      id: movement.id,
      accountId: movement.accountId,
      amount: movement.amount.toFixed(2),
      reversed: Boolean(reversal),
    };
  },
  async append(input) {
    return db.$transaction(async (tx) => {
      const account = await tx.customerAccount.findFirstOrThrow({
        where: {
          id: String(input.accountId),
          globalTenantId: String(input.globalTenantId),
          status: "ACTIVE",
        },
        include: { movements: { select: { amount: true } } },
      });
      const branch = await tx.branch.findFirstOrThrow({
        where: {
          id: String(input.branchId),
          globalTenantId: String(input.globalTenantId),
          active: true,
        },
      });
      if (input.reversalOfId) {
        const original = await tx.customerAccountMovement.findFirstOrThrow({
          where: {
            id: String(input.reversalOfId),
            globalTenantId: String(input.globalTenantId),
            accountId: account.id,
          },
        });
        const reversed = await tx.customerAccountMovement.findUnique({
          where: { reversalOfId: original.id },
        });
        if (reversed) throw new Error("REST_ACCOUNT_MOVEMENT_ALREADY_REVERSED");
      }
      const current = account.movements.reduce(
        (sum, movement) => sum.add(movement.amount),
        new Prisma.Decimal(0),
      );
      const amount = new Prisma.Decimal(String(input.signedAmount));
      const balanceAfter = current.add(amount);
      if (
        input.type === "CHARGE" &&
        account.creditLimit &&
        balanceAfter.greaterThan(account.creditLimit)
      ) throw new Error("REST_ACCOUNT_CREDIT_LIMIT_EXCEEDED");
      const movement = await tx.customerAccountMovement.create({
        data: {
          restTenantId: account.restTenantId,
          globalTenantId: account.globalTenantId,
          branchId: branch.id,
          accountId: account.id,
          paymentId: input.paymentId ? String(input.paymentId) : null,
          type: String(input.type),
          amount,
          balanceAfter,
          reason: String(input.reason),
          actorId: String(input.actorId),
          commandId: String(input.commandId),
          reversalOfId: input.reversalOfId ? String(input.reversalOfId) : null,
        },
      });
      const response = {
        id: movement.id,
        accountId: account.id,
        type: movement.type,
        amount: movement.amount.toFixed(2),
        balanceAfter: movement.balanceAfter.toFixed(2),
      };
      await tx.financialCommandReceipt.create({
        data: {
          restTenantId: account.restTenantId,
          globalTenantId: account.globalTenantId,
          commandId: String(input.commandId),
          response: json(response),
        },
      });
      return response;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },
};
