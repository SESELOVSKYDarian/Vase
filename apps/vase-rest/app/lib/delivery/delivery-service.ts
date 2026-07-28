import { z } from "zod";
import type { DeliveryProviderAdapter } from "./provider-adapter";

type DeliveryOrder = {
  id: string;
  globalTenantId: string;
  branchId: string;
  connectionId: string;
  providerOrderId: string;
  status: string;
};

type Connection = {
  id: string;
  status: string;
  provider: string;
};

type DeliveryRepository = {
  findReceipt(globalTenantId: string, commandId: string): Promise<unknown | null>;
  getOrder(
    globalTenantId: string,
    branchId: string,
    deliveryOrderId: string,
  ): Promise<DeliveryOrder | null>;
  getConnection(connectionId: string): Promise<Connection | null>;
  adapterFor(connection: Connection): DeliveryProviderAdapter | null;
  saveResult(input: Record<string, unknown>): Promise<unknown>;
};

const base = z.object({
  globalTenantId: z.string().min(1),
  branchId: z.string().min(1),
  deliveryOrderId: z.string().min(1),
  commandId: z.string().min(1).max(64),
  actorId: z.string().min(1),
});

export function createDeliveryService(repository: DeliveryRepository) {
  async function prepare(raw: unknown) {
    const input = base.passthrough().parse(raw);
    const receipt = await repository.findReceipt(
      input.globalTenantId,
      input.commandId,
    );
    if (receipt) return { input, receipt };
    const order = await repository.getOrder(
      input.globalTenantId,
      input.branchId,
      input.deliveryOrderId,
    );
    if (!order) throw new Error("REST_DELIVERY_ORDER_NOT_FOUND");
    const connection = await repository.getConnection(order.connectionId);
    if (!connection || connection.status !== "ACTIVE") {
      throw new Error(
        connection?.status === "CERTIFICATION_REQUIRED"
          ? "REST_DELIVERY_CERTIFICATION_REQUIRED"
          : "REST_DELIVERY_CONNECTION_INACTIVE",
      );
    }
    const adapter = repository.adapterFor(connection);
    if (!adapter) throw new Error("REST_DELIVERY_CERTIFICATION_REQUIRED");
    return { input, order, connection, adapter };
  }

  async function execute(
    raw: unknown,
    action: "ACCEPT" | "REJECT" | "UPDATE" | "CANCEL",
  ) {
    const prepared = await prepare(raw);
    if (prepared.receipt) return prepared.receipt;
    const { input, order, adapter } = prepared;
    if (!order || !adapter) throw new Error("REST_DELIVERY_OPERATION_INVALID");
    const extra = z.object({
      reason: z.string().trim().min(2).max(500).optional(),
      status: z.string().trim().min(2).max(60).optional(),
    }).passthrough().parse(raw);
    const operation = action === "ACCEPT"
      ? adapter.accept?.(order.providerOrderId, input.commandId)
      : action === "REJECT"
        ? adapter.reject?.(
            order.providerOrderId,
            input.commandId,
            extra.reason ?? (() => {
              throw new Error("REST_DELIVERY_REASON_REQUIRED");
            })(),
          )
        : action === "UPDATE"
          ? adapter.update?.(
              order.providerOrderId,
              input.commandId,
              extra.status ?? (() => {
                throw new Error("REST_DELIVERY_STATUS_REQUIRED");
              })(),
            )
          : adapter.cancel?.(
              order.providerOrderId,
              input.commandId,
              extra.reason ?? (() => {
                throw new Error("REST_DELIVERY_REASON_REQUIRED");
              })(),
            );
    if (!operation) throw new Error("REST_DELIVERY_OPERATION_NOT_SUPPORTED");
    const result = await operation;
    if (result.providerOrderId !== order.providerOrderId) {
      throw new Error("REST_DELIVERY_PROVIDER_ORDER_MISMATCH");
    }
    return repository.saveResult({
      ...input,
      action,
      deliveryOrderId: order.id,
      status: result.status,
      providerResponse: result.response,
    });
  }

  return {
    accept: (raw: unknown) => execute(base.strict().parse(raw), "ACCEPT"),
    reject: (raw: unknown) => execute(
      base.extend({ reason: z.string().trim().min(2).max(500) }).strict().parse(raw),
      "REJECT",
    ),
    update: (raw: unknown) => execute(
      base.extend({ status: z.string().trim().min(2).max(60) }).strict().parse(raw),
      "UPDATE",
    ),
    cancel: (raw: unknown) => execute(
      base.extend({ reason: z.string().trim().min(2).max(500) }).strict().parse(raw),
      "CANCEL",
    ),
  };
}
