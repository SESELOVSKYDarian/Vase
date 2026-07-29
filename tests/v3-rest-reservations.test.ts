import { describe, expect, it, vi } from "vitest";
import { createReservationService } from "../apps/vase-rest/app/lib/reservations/reservation-service";

describe("Rest reservations", () => {
  it("assigns multiple tables only when capacity is sufficient and no overlap exists", async () => {
    const create = vi.fn(async (input) => ({ id: "reservation_1", revision: 1, ...input }));
    const service = createReservationService({
      getTables: async () => [
        { id: "table_1", capacity: 4 }, { id: "table_2", capacity: 2 },
      ],
      hasOverlap: async () => false,
      create,
      cancel: vi.fn(),
    });
    await service.create({
      globalTenantId: "tenant_1", branchId: "branch_1",
      guestName: "Ana", guestPhone: "+5491112345678", partySize: 6,
      startsAt: "2026-07-29T20:00:00.000Z", endsAt: "2026-07-29T22:00:00.000Z",
      tableIds: ["table_1", "table_2"], actorId: "manager_1",
    });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("rejects overlap, insufficient capacity and invalid cancellation revisions", async () => {
    const repository = {
      getTables: async () => [{ id: "table_1", capacity: 4 }],
      hasOverlap: async () => true,
      create: vi.fn(),
      cancel: vi.fn(),
    };
    const service = createReservationService(repository);
    const input = {
      globalTenantId: "tenant_1", branchId: "branch_1",
      guestName: "Ana", partySize: 5,
      startsAt: "2026-07-29T20:00:00.000Z", endsAt: "2026-07-29T22:00:00.000Z",
      tableIds: ["table_1"], actorId: "manager_1",
    };
    await expect(service.create(input)).rejects.toThrow("REST_RESERVATION_CAPACITY_INSUFFICIENT");
    await expect(service.create({ ...input, partySize: 4 }))
      .rejects.toThrow("REST_RESERVATION_OVERLAP");
  });
});
