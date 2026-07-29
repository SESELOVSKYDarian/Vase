import { describe, expect, it, vi } from "vitest";
import { createCloudSyncService } from "../apps/vase-rest/app/lib/edge/sync-service";

const event = {
  eventId: "event_1", globalTenantId: "tenant_1", branchId: "branch_1",
  installationId: "edge_1", actorId: "staff_1", deviceId: "device_1",
  aggregateType: "ORDER", aggregateId: "order_1", aggregateVersion: 1,
  eventType: "ORDER_OPENED", idempotencyKey: "command_1",
  occurredAt: "2026-07-29T00:00:00.000Z", payload: { guestCount: 2 },
};

describe("Rest cloud Edge sync", () => {
  it("returns prior receipts for duplicate event IDs", async () => {
    const prior = { eventId: "event_1", status: "ACCEPTED" as const, aggregateVersion: 1 };
    const apply = vi.fn();
    const service = createCloudSyncService({
      findReceipt: async () => prior,
      getAggregateVersion: vi.fn(),
      apply,
    });
    await expect(service.accept(event)).resolves.toEqual(prior);
    expect(apply).not.toHaveBeenCalled();
  });

  it("accepts the next aggregate version atomically and returns stable conflicts", async () => {
    const apply = vi.fn(async () => ({
      eventId: "event_1", status: "ACCEPTED" as const, aggregateVersion: 1,
    }));
    const repository = {
      findReceipt: async () => null,
      getAggregateVersion: async () => 0,
      apply,
    };
    const service = createCloudSyncService(repository);
    await expect(service.accept(event)).resolves.toMatchObject({ status: "ACCEPTED" });
    expect(apply).toHaveBeenCalledTimes(1);

    repository.getAggregateVersion = async () => 3;
    await expect(service.accept({ ...event, eventId: "event_2", aggregateVersion: 2 }))
      .resolves.toEqual({
        eventId: "event_2", status: "CONFLICT",
        aggregateVersion: 3, expectedVersion: 4, code: "AGGREGATE_VERSION_CONFLICT",
      });
  });
});
