import { z } from "zod";
import { centsToMoney, moneySchema, moneyToCents } from "../cash/money";

type Account = {
  id: string;
  globalTenantId: string;
  status: string;
  balance: string;
  creditLimit: string | null;
};

type Movement = {
  id: string;
  accountId: string;
  amount: string;
  reversed: boolean;
};

export type CustomerAccountRepository = {
  findReceipt(globalTenantId: string, commandId: string): Promise<unknown | null>;
  getAccount(globalTenantId: string, accountId: string): Promise<Account | null>;
  getMovement(globalTenantId: string, movementId: string): Promise<Movement | null>;
  append(input: Record<string, unknown> & {
    type: string;
    signedAmount: string;
  }): Promise<unknown>;
};

const base = z.object({
  globalTenantId: z.string().min(1),
  branchId: z.string().min(1),
  accountId: z.string().min(1),
  amount: moneySchema.refine((value) => moneyToCents(value) > 0),
  reason: z.string().trim().min(2).max(500),
  commandId: z.string().min(1),
  actorId: z.string().min(1),
});

function signedMoneyToCents(value: string) {
  const negative = value.startsWith("-");
  const cents = moneyToCents(negative ? value.slice(1) : value);
  return negative ? -cents : cents;
}

export function createCustomerAccountService(repository: CustomerAccountRepository) {
  async function account(input: {
    globalTenantId: string;
    accountId: string;
  }) {
    const value = await repository.getAccount(input.globalTenantId, input.accountId);
    if (!value || value.status !== "ACTIVE") throw new Error("REST_ACCOUNT_INACTIVE");
    return value;
  }
  async function prior(globalTenantId: string, commandId: string) {
    return repository.findReceipt(globalTenantId, commandId);
  }
  return {
    async charge(raw: unknown) {
      const input = base.strict().parse(raw);
      const receipt = await prior(input.globalTenantId, input.commandId);
      if (receipt) return receipt;
      const current = await account(input);
      if (
        current.creditLimit &&
        moneyToCents(current.balance) + moneyToCents(input.amount) >
          moneyToCents(current.creditLimit)
      ) throw new Error("REST_ACCOUNT_CREDIT_LIMIT_EXCEEDED");
      return repository.append({
        ...input,
        type: "CHARGE",
        signedAmount: centsToMoney(moneyToCents(input.amount)),
      });
    },
    async payment(raw: unknown) {
      const input = base.strict().parse(raw);
      const receipt = await prior(input.globalTenantId, input.commandId);
      if (receipt) return receipt;
      await account(input);
      return repository.append({
        ...input,
        type: "PAYMENT",
        signedAmount: centsToMoney(-moneyToCents(input.amount)),
      });
    },
    async adjustment(raw: unknown) {
      const input = base.extend({
        direction: z.enum(["DEBIT", "CREDIT"]),
      }).strict().parse(raw);
      const receipt = await prior(input.globalTenantId, input.commandId);
      if (receipt) return receipt;
      await account(input);
      return repository.append({
        ...input,
        type: "ADJUSTMENT",
        signedAmount: centsToMoney(
          input.direction === "DEBIT"
            ? moneyToCents(input.amount)
            : -moneyToCents(input.amount),
        ),
      });
    },
    async reverse(raw: unknown) {
      const input = z.object({
        globalTenantId: z.string().min(1),
        branchId: z.string().min(1),
        accountId: z.string().min(1),
        movementId: z.string().min(1),
        reason: z.string().trim().min(2).max(500),
        commandId: z.string().min(1),
        actorId: z.string().min(1),
      }).strict().parse(raw);
      const receipt = await prior(input.globalTenantId, input.commandId);
      if (receipt) return receipt;
      await account(input);
      const movement = await repository.getMovement(
        input.globalTenantId,
        input.movementId,
      );
      if (!movement || movement.accountId !== input.accountId) {
        throw new Error("REST_ACCOUNT_MOVEMENT_NOT_FOUND");
      }
      if (movement.reversed) {
        throw new Error("REST_ACCOUNT_MOVEMENT_ALREADY_REVERSED");
      }
      const signedAmount = centsToMoney(-signedMoneyToCents(movement.amount));
      return repository.append({
        ...input,
        type: "REVERSAL",
        signedAmount,
        reversalOfId: movement.id,
      });
    },
  };
}
