import { describe, expect, it, vi } from "vitest";
import { createKitchenService } from "../apps/vase-rest/app/lib/kds/kitchen-service";

describe("Rest kitchen display", () => {
  it("routes submitted categories to stations and transitions tickets item by item", async () => {
    const transition = vi.fn(async (input) => ({ ...input, revision: input.expectedRevision + 1 }));
    const service = createKitchenService({
      findTicket: async () => ({
        id: "ticket_1", globalTenantId: "tenant_1", branchId: "branch_1",
        status: "QUEUED", revision: 2,
      }),
      transition,
      markServed: vi.fn(),
    });
    await service.transition({
      globalTenantId: "tenant_1", branchId: "branch_1", ticketId: "ticket_1",
      expectedRevision: 2, to: "PREPARING", commandId: "prep_1", actorId: "cook_1",
    });
    expect(transition).toHaveBeenCalledWith(expect.objectContaining({
      from: "QUEUED", to: "PREPARING",
    }));
  });

  it("allows queued → preparing → ready and rejects invalid or stale changes", async () => {
    const repository = {
      findTicket: async () => ({
        id: "ticket_1", globalTenantId: "tenant_1", branchId: "branch_1",
        status: "READY", revision: 4,
      }),
      transition: vi.fn(),
      markServed: vi.fn(),
    };
    const service = createKitchenService(repository);
    await expect(service.transition({
      globalTenantId: "tenant_1", branchId: "branch_1", ticketId: "ticket_1",
      expectedRevision: 3, to: "PREPARING", commandId: "bad_1", actorId: "cook_1",
    })).rejects.toThrow("REST_KDS_REVISION_CONFLICT");
    await expect(service.transition({
      globalTenantId: "tenant_1", branchId: "branch_1", ticketId: "ticket_1",
      expectedRevision: 4, to: "PREPARING", commandId: "bad_2", actorId: "cook_1",
    })).rejects.toThrow("REST_KDS_TRANSITION_INVALID");
  });
});
