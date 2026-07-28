import { z } from "zod";

type OrderRecord = {
  id: string; globalTenantId: string; branchId: string; status: string; revision: number;
};
type BaseCommand = {
  globalTenantId: string; branchId: string; orderId: string;
  expectedRevision: number; commandId: string; actorId: string;
};
export interface OrderRepository {
  findCommand(globalTenantId: string, commandId: string): Promise<unknown | null>;
  getOrder(globalTenantId: string, branchId: string, orderId: string): Promise<OrderRecord | null>;
  execute(input: Record<string, unknown> & { action: string; commandId: string }): Promise<unknown>;
}

const baseSchema = z.object({
  globalTenantId: z.string().min(1), branchId: z.string().min(1),
  orderId: z.string().min(1), expectedRevision: z.number().int().positive(),
  commandId: z.string().min(1), actorId: z.string().min(1),
});

export function createOrderService(repository: OrderRepository) {
  async function existing(globalTenantId: string, commandId: string) {
    return repository.findCommand(globalTenantId, commandId);
  }
  async function validate(input: BaseCommand, statuses: string[]) {
    const order = await repository.getOrder(input.globalTenantId, input.branchId, input.orderId);
    if (
      !order ||
      order.globalTenantId !== input.globalTenantId ||
      order.branchId !== input.branchId
    ) throw new Error("REST_ORDER_NOT_FOUND");
    if (order.revision !== input.expectedRevision) throw new Error("REST_ORDER_REVISION_CONFLICT");
    if (!statuses.includes(order.status)) throw new Error("REST_ORDER_STATUS_INVALID");
    return order;
  }
  return {
    async open(raw: unknown) {
      const input = z.object({
        globalTenantId: z.string().min(1), branchId: z.string().min(1),
        tableId: z.string().min(1).optional(), guestCount: z.number().int().positive().max(500),
        commandId: z.string().min(1), actorId: z.string().min(1),
      }).strict().parse(raw);
      const prior = await existing(input.globalTenantId, input.commandId);
      return prior ?? repository.execute({ action: "OPEN", ...input });
    },
    async addItem(raw: unknown) {
      const input = baseSchema.extend({
        productId: z.string().min(1), quantity: z.number().int().positive().max(999),
        course: z.number().int().positive().max(20),
        notes: z.string().max(1000).optional(),
        modifiers: z.array(z.object({
          optionId: z.string().min(1), quantity: z.number().int().positive().max(99),
        }).strict()),
      }).strict().parse(raw);
      const prior = await existing(input.globalTenantId, input.commandId);
      if (prior) return prior;
      await validate(input, ["OPEN"]);
      return repository.execute({ action: "ADD_ITEM", ...input });
    },
    async submit(raw: unknown) {
      const input = baseSchema.strict().parse(raw);
      const prior = await existing(input.globalTenantId, input.commandId);
      if (prior) return prior;
      await validate(input, ["OPEN"]);
      return repository.execute({ action: "SUBMIT", ...input });
    },
    async cancel(raw: unknown) {
      const input = baseSchema.extend({ reason: z.string().min(2).max(500) }).strict().parse(raw);
      const prior = await existing(input.globalTenantId, input.commandId);
      if (prior) return prior;
      await validate(input, ["OPEN", "SUBMITTED", "PARTIALLY_READY"]);
      return repository.execute({ action: "CANCEL", ...input });
    },
    async split(raw: unknown) {
      const input = baseSchema.extend({
        itemIds: z.array(z.string().min(1)).min(1),
      }).strict().parse(raw);
      const prior = await existing(input.globalTenantId, input.commandId);
      if (prior) return prior;
      await validate(input, ["OPEN"]);
      return repository.execute({ action: "SPLIT", ...input });
    },
    async merge(raw: unknown) {
      const input = baseSchema.extend({ sourceOrderId: z.string().min(1) }).strict().parse(raw);
      const prior = await existing(input.globalTenantId, input.commandId);
      if (prior) return prior;
      await validate(input, ["OPEN"]);
      const source = await repository.getOrder(
        input.globalTenantId, input.branchId, input.sourceOrderId,
      );
      if (!source || source.status !== "OPEN") throw new Error("REST_ORDER_SOURCE_INVALID");
      return repository.execute({ action: "MERGE", ...input });
    },
  };
}
