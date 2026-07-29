import { describe, expect, it } from "vitest";
import { buildRestAdminOperations } from "../apps/vase-rest/app/lib/admin/operations";
import { assertServiceToken } from "@vase/internal-api";

describe("Rest admin operational projection", () => {
  it("requires the internal service token", () => {
    expect(() => assertServiceToken(null, "real-service-token")).toThrow("FORBIDDEN");
    expect(() => assertServiceToken("Bearer wrong", "real-service-token"))
      .toThrow("FORBIDDEN");
    expect(() => assertServiceToken("Bearer real-service-token", "real-service-token"))
      .not.toThrow();
  });
  it("reports tenant capacity and Edge degradation without operational secrets", () => {
    const result = buildRestAdminOperations({
      now: new Date("2026-07-28T16:10:00.000Z"),
      tenants: [{
        globalTenantId: "tenant_1",
        name: "Restaurante Uno",
        slug: "restaurante-uno",
        entitlement: { plan: "PRO", status: "ACTIVE", contractVersion: 4 },
        branchCount: 2,
        staffCount: 18,
        deviceCount: 6,
        edgeCount: 2,
        degradedIntegrations: 1,
      }],
      edges: [{
        id: "edge_1",
        globalTenantId: "tenant_1",
        branchId: "branch_1",
        branchName: "Centro",
        name: "Servidor Centro",
        status: "ACTIVE",
        agentVersion: "0.1.0",
        lastSeenAt: new Date("2026-07-28T16:09:30.000Z"),
        lastCloudSyncAt: new Date("2026-07-28T15:40:00.000Z"),
        pendingEventCount: 12,
        failedPrintJobCount: 1,
        lastErrorCode: "EDGE_SYNC_FAILED",
      }],
    });
    expect(result.tenants[0]).toMatchObject({
      branchCount: 2,
      degradedIntegrations: 1,
    });
    expect(result.edges[0]).toMatchObject({
      operationalState: "DEGRADED",
      pendingEventCount: 12,
      failedPrintJobCount: 1,
    });
    expect(JSON.stringify(result)).not.toMatch(
      /certificateFingerprint|accessToken|clientSecret|pinHash|DATABASE_URL/,
    );
  });
});
