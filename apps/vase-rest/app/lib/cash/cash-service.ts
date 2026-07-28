import { z } from "zod";
import { centsToMoney, moneySchema, moneyToCents } from "./money";

type Drawer = {
  id: string;
  globalTenantId: string;
  branchId: string;
  status: string;
  revision: number;
  expectedCash: string;
};

export type CashRepository = {
  findReceipt(globalTenantId: string, commandId: string): Promise<unknown | null>;
  findOpenDrawer(globalTenantId: string, branchId: string, stationId: string):
    Promise<{ id: string } | null>;
  getDrawer(globalTenantId: string, branchId: string, drawerId: string):
    Promise<Drawer | null>;
  execute(input: Record<string, unknown> & { action: string; commandId: string }):
    Promise<unknown>;
};

const scopeSchema = z.object({
  globalTenantId: z.string().min(1),
  branchId: z.string().min(1),
  commandId: z.string().min(1),
  actorId: z.string().min(1),
});

export function createCashService(repository: CashRepository) {
  async function drawer(input: {
    globalTenantId: string;
    branchId: string;
    drawerId: string;
    expectedRevision: number;
  }) {
    const current = await repository.getDrawer(
      input.globalTenantId,
      input.branchId,
      input.drawerId,
    );
    if (!current || current.status !== "OPEN") throw new Error("REST_CASH_DRAWER_NOT_OPEN");
    if (current.revision !== input.expectedRevision) {
      throw new Error("REST_CASH_REVISION_CONFLICT");
    }
    return current;
  }
  return {
    async open(raw: unknown) {
      const input = scopeSchema.extend({
        stationId: z.string().min(1).max(100),
        openingFloat: moneySchema,
      }).strict().parse(raw);
      const receipt = await repository.findReceipt(input.globalTenantId, input.commandId);
      if (receipt) return receipt;
      if (await repository.findOpenDrawer(
        input.globalTenantId,
        input.branchId,
        input.stationId,
      )) throw new Error("REST_CASH_DRAWER_ALREADY_OPEN");
      return repository.execute({ action: "OPEN", ...input });
    },
    async movement(raw: unknown) {
      const input = scopeSchema.extend({
        drawerId: z.string().min(1),
        type: z.enum(["PAID_IN", "PAID_OUT"]),
        amount: moneySchema.refine((value) => moneyToCents(value) > BigInt(0)),
        reason: z.string().min(2).max(500),
        expectedRevision: z.number().int().positive(),
      }).strict().parse(raw);
      const receipt = await repository.findReceipt(input.globalTenantId, input.commandId);
      if (receipt) return receipt;
      await drawer(input);
      const signedAmount = centsToMoney(
        moneyToCents(input.amount) * (input.type === "PAID_OUT" ? BigInt(-1) : BigInt(1)),
      );
      return repository.execute({ action: "MOVEMENT", ...input, signedAmount });
    },
    async close(raw: unknown) {
      const input = scopeSchema.extend({
        drawerId: z.string().min(1),
        countedCash: moneySchema,
        expectedRevision: z.number().int().positive(),
      }).strict().parse(raw);
      const receipt = await repository.findReceipt(input.globalTenantId, input.commandId);
      if (receipt) return receipt;
      const current = await drawer(input);
      const variance = centsToMoney(
        moneyToCents(input.countedCash) - moneyToCents(current.expectedCash),
      );
      return repository.execute({ action: "CLOSE", ...input, variance });
    },
  };
}
