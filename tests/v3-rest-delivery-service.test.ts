import { describe, expect, it, vi } from "vitest";
import { createDeliveryService } from "../apps/vase-rest/app/lib/delivery/delivery-service";

describe("Rest delivery service", () => {
  it("rejects operations until the connection has an approved adapter", async () => {
    const service = createDeliveryService({
      findReceipt: async () => null,
      getOrder: async () => ({
        id: "delivery_1",
        globalTenantId: "tenant_1",
        branchId: "branch_1",
        connectionId: "connection_1",
        providerOrderId: "provider_1",
        status: "RECEIVED",
      }),
      getConnection: async () => ({
        id: "connection_1",
        status: "CERTIFICATION_REQUIRED",
        provider: "RAPPI",
      }),
      saveResult: vi.fn(),
      adapterFor: () => null,
    });
    await expect(service.accept({
      globalTenantId: "tenant_1",
      branchId: "branch_1",
      deliveryOrderId: "delivery_1",
      commandId: "accept_1",
      actorId: "manager_1",
    })).rejects.toThrow("REST_DELIVERY_CERTIFICATION_REQUIRED");
  });

  it("persists only the state confirmed by the active provider adapter", async () => {
    const saveResult = vi.fn(async (value) => value);
    const accept = vi.fn(async () => ({
      providerOrderId: "provider_1",
      status: "ACCEPTED",
      response: { status: "accepted" },
    }));
    const service = createDeliveryService({
      findReceipt: async () => null,
      getOrder: async () => ({
        id: "delivery_1",
        globalTenantId: "tenant_1",
        branchId: "branch_1",
        connectionId: "connection_1",
        providerOrderId: "provider_1",
        status: "RECEIVED",
      }),
      getConnection: async () => ({
        id: "connection_1",
        status: "ACTIVE",
        provider: "CERTIFIED_PROVIDER",
      }),
      saveResult,
      adapterFor: () => ({
        accept,
        reject: vi.fn(),
        update: vi.fn(),
        cancel: vi.fn(),
      }),
    });
    await service.accept({
      globalTenantId: "tenant_1",
      branchId: "branch_1",
      deliveryOrderId: "delivery_1",
      commandId: "accept_1",
      actorId: "manager_1",
    });
    expect(accept).toHaveBeenCalledWith("provider_1", "accept_1");
    expect(saveResult).toHaveBeenCalledWith(expect.objectContaining({
      deliveryOrderId: "delivery_1",
      status: "ACCEPTED",
    }));
  });
});
