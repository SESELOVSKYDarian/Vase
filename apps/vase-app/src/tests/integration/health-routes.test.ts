import { beforeEach, describe, expect, it, vi } from "vitest";

const getReadinessPayload = vi.fn();
const getOperationalMetrics = vi.fn();

vi.mock("@/server/services/health", () => ({
  getLivenessPayload: () => ({
    status: "ok",
    service: "Vase",
    environment: "test",
    uptimeSeconds: 120,
    timestamp: "2026-03-31T10:00:00.000Z",
  }),
  getReadinessPayload,
}));

vi.mock("@/server/queries/operations", () => ({
  getOperationalMetrics,
}));

describe("health routes", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    getReadinessPayload.mockResolvedValue({
      status: "ok",
      service: "Vase",
      environment: "test",
      uptimeSeconds: 120,
      timestamp: "2026-03-31T10:00:00.000Z",
      checks: { database: "ok" },
      latencyMs: 4,
    });
    getOperationalMetrics.mockResolvedValue({
      users: 3,
      tenants: 1,
      supportTicketsOpen: 0,
      temporaryPagesAtRisk: 0,
      integrationCredentialsActive: 1,
      auditEventsLast24h: 10,
    });
    process.env.MONITORING_TOKEN = "monitoring-secret";
  });

  it("serves liveness probe", async () => {
    const { GET } = await import("@/app/api/health/live/route");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("ok");
  });

  it("serves readiness probe", async () => {
    const { GET } = await import("@/app/api/health/ready/route");
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.checks.database).toBe("ok");
  });

  it("protects metrics endpoint with monitoring token", async () => {
    const { GET } = await import("@/app/api/ops/metrics/route");
    const forbiddenResponse = await GET(new Request("http://localhost/api/ops/metrics"));
    const okResponse = await GET(
      new Request("http://localhost/api/ops/metrics", {
        headers: {
          authorization: "Bearer monitoring-secret",
        },
      }),
    );

    expect(forbiddenResponse.status).toBe(403);
    expect(okResponse.status).toBe(200);
  });
});
