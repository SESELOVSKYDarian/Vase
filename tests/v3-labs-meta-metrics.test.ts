import { describe, expect, it } from "vitest";
import { createMetaMetrics } from "../apps/vase-labs/app/lib/meta-metrics";

describe("Meta connection metrics", () => {
  it("emits structured events without accepting secret fields", () => {
    const events: unknown[] = [];
    const metrics = createMetaMetrics((event) => events.push(event));

    metrics.record({
      event: "connection_completed",
      channelType: "INSTAGRAM",
      globalTenantId: "tenant_123",
    });

    expect(events).toEqual([{
      scope: "meta_channels",
      event: "connection_completed",
      channelType: "INSTAGRAM",
      globalTenantId: "tenant_123",
    }]);
    expect(JSON.stringify(events)).not.toMatch(/token|secret/i);
  });
});
