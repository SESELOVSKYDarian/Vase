import { z } from "zod";
import { centsToMoney, moneySchema, moneyToCents } from "../cash/money";

type PaymentOrder = {
  id: string;
  globalTenantId: string;
  branchId: string;
  status: string;
  total: string;
  paidTotal: string;
  allowedPromotionTenderTypes?: string[];
};

export type PaymentRepository = {
  findReceipt(globalTenantId: string, commandId: string): Promise<unknown | null>;
  getOrder(globalTenantId: string, branchId: string, orderId: string):
    Promise<PaymentOrder | null>;
  getOpenDrawer(globalTenantId: string, branchId: string):
    Promise<{ id: string } | null>;
  execute(input: Record<string, unknown> & { action: string; commandId: string }):
    Promise<unknown>;
};

export function createPaymentService(repository: PaymentRepository) {
  return {
    async apply(raw: unknown) {
      const input = z.object({
        globalTenantId: z.string().min(1),
        branchId: z.string().min(1),
        orderId: z.string().min(1),
        tenderType: z.enum([
          "CASH",
          "BANK_TRANSFER",
          "EXTERNAL_TERMINAL",
          "EXTERNAL_WALLET",
          "CUSTOMER_ACCOUNT",
        ]),
        amount: moneySchema.refine((value) => moneyToCents(value) > BigInt(0)),
        provider: z.string().min(1).max(100).optional(),
        reference: z.string().min(1).max(200).optional(),
        operator: z.string().min(1).max(100).optional(),
        customerAccountId: z.string().min(1).optional(),
        commandId: z.string().min(1),
        actorId: z.string().min(1),
      }).strict().parse(raw);
      const receipt = await repository.findReceipt(input.globalTenantId, input.commandId);
      if (receipt) return receipt;
      const order = await repository.getOrder(
        input.globalTenantId,
        input.branchId,
        input.orderId,
      );
      if (!order || ["CANCELLED", "PAID"].includes(order.status)) {
        throw new Error("REST_PAYMENT_ORDER_INVALID");
      }
      if (
        order.allowedPromotionTenderTypes &&
        !order.allowedPromotionTenderTypes.includes(input.tenderType)
      ) {
        throw new Error("REST_PROMOTION_TENDER_MISMATCH");
      }
      let drawerId: string | undefined;
      if (input.tenderType === "CASH") {
        drawerId = (await repository.getOpenDrawer(
          input.globalTenantId,
          input.branchId,
        ))?.id;
        if (!drawerId) throw new Error("REST_CASH_DRAWER_REQUIRED");
      } else if (input.tenderType === "CUSTOMER_ACCOUNT") {
        if (!input.customerAccountId) throw new Error("REST_CUSTOMER_ACCOUNT_REQUIRED");
      } else {
        if (!input.provider || !input.reference || !input.operator) {
          throw new Error("REST_PAYMENT_REFERENCE_REQUIRED");
        }
      }
      const remaining = moneyToCents(order.total) - moneyToCents(order.paidTotal);
      if (moneyToCents(input.amount) > remaining) {
        throw new Error("REST_PAYMENT_EXCEEDS_BALANCE");
      }
      return repository.execute({
        action: "APPLY",
        ...input,
        drawerId,
        remainingAfter: centsToMoney(remaining - moneyToCents(input.amount)),
      });
    },
  };
}
