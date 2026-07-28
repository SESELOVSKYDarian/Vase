import { z } from "zod";
import { moneySchema, moneyToCents } from "../cash/money";

type PreparedRefund = {
  refundId: string;
  paymentId: string;
  tenderType: string;
  paymentAmount: string;
  alreadyRefunded: string;
  providerOrderId?: string;
  providerPaymentId?: string;
};

type ProviderRefund = {
  orderId: string;
  refundId: string;
  transactionId: string;
  amount: string;
  status: string;
  response: unknown;
};

type RefundRepository = {
  findRefund(globalTenantId: string, commandId: string): Promise<unknown | null>;
  prepare(input: Record<string, unknown>): Promise<PreparedRefund>;
  providerRefund(
    prepared: PreparedRefund,
    input: { amount: string; commandId: string; full: boolean },
  ): Promise<ProviderRefund>;
  markState(refundId: string, state: Record<string, unknown>): Promise<unknown>;
  finalize(refundId: string, state: Record<string, unknown>): Promise<unknown>;
};

export function createRefundService(repository: RefundRepository) {
  return {
    async refund(raw: unknown) {
      const input = z.object({
        globalTenantId: z.string().min(1),
        branchId: z.string().min(1),
        paymentId: z.string().min(1),
        amount: moneySchema.refine((value) => moneyToCents(value) > 0),
        reason: z.string().trim().min(2).max(500),
        externalReference: z.string().trim().min(1).max(200).optional(),
        operator: z.string().trim().min(1).max(100).optional(),
        commandId: z.string().min(1).max(64),
        actorId: z.string().min(1),
      }).strict().parse(raw);
      const prior = await repository.findRefund(
        input.globalTenantId,
        input.commandId,
      );
      if (prior) return prior;
      const prepared = await repository.prepare(input);
      const available = moneyToCents(prepared.paymentAmount) -
        moneyToCents(prepared.alreadyRefunded);
      if (moneyToCents(input.amount) > available) {
        throw new Error("REST_REFUND_EXCEEDS_PAYMENT");
      }
      if (prepared.tenderType !== "MERCADO_PAGO") {
        if (
          !["CASH", "CUSTOMER_ACCOUNT"].includes(prepared.tenderType) &&
          (!input.externalReference || !input.operator)
        ) throw new Error("REST_REFUND_EXTERNAL_CONFIRMATION_REQUIRED");
        return repository.finalize(prepared.refundId, {
          status: "APPLIED",
          ...(input.externalReference ? {
            providerRefundId: input.externalReference,
            providerResponse: {
              confirmation: "USER_RECORDED",
              operator: input.operator,
            },
          } : {}),
        });
      }
      if (!prepared.providerOrderId || !prepared.providerPaymentId) {
        throw new Error("REST_REFUND_PROVIDER_LINK_MISSING");
      }
      let provider: ProviderRefund;
      try {
        provider = await repository.providerRefund(prepared, {
          amount: input.amount,
          commandId: input.commandId,
          full: moneyToCents(prepared.alreadyRefunded) === BigInt(0) &&
            moneyToCents(input.amount) === moneyToCents(prepared.paymentAmount),
        });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "REST_MP_RESPONSE_AMBIGUOUS"
        ) {
          await repository.markState(prepared.refundId, { status: "AMBIGUOUS" });
        }
        throw error;
      }
      if (
        provider.orderId !== prepared.providerOrderId ||
        provider.transactionId !== prepared.providerPaymentId ||
        moneyToCents(provider.amount) !== moneyToCents(input.amount)
      ) {
        await repository.markState(prepared.refundId, {
          status: "PROVIDER_MISMATCH",
          providerResponse: provider.response,
        });
        throw new Error("REST_REFUND_PROVIDER_MISMATCH");
      }
      if (provider.status !== "processed") {
        return repository.markState(prepared.refundId, {
          status: "PROCESSING",
          providerRefundId: provider.refundId,
          providerResponse: provider.response,
        });
      }
      return repository.finalize(prepared.refundId, {
        status: "APPLIED",
        providerRefundId: provider.refundId,
        providerResponse: provider.response,
      });
    },
  };
}
