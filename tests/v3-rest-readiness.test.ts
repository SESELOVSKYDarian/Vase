import { describe, expect, it } from "vitest";
import { getRestReadinessPayload } from "../apps/vase-rest/app/lib/rest-readiness";

describe("Vase Rest readiness", () => {
  it("reports the dedicated PostgreSQL service when the bounded ping succeeds", async () => {
    const payload = await getRestReadinessPayload({
      pingDatabase: async () => undefined,
      timeoutMs: 20,
      now: new Date("2026-07-28T14:00:00.000Z"),
    });

    expect(payload).toMatchObject({
      service: "vase-rest",
      domain: "rest.vase.ar",
      status: "ok",
      checks: {
        app: "ok",
        database: "postgres-rest",
      },
      timestamp: "2026-07-28T14:00:00.000Z",
    });
  });

  it("degrades within the timeout without exposing database error details", async () => {
    const startedAt = Date.now();
    const payload = await getRestReadinessPayload({
      pingDatabase: () => new Promise(() => undefined),
      timeoutMs: 10,
      now: new Date("2026-07-28T14:00:00.000Z"),
    });

    expect(Date.now() - startedAt).toBeLessThan(250);
    expect(payload.status).toBe("degraded");
    expect(payload.checks.database).toBe("error");
    expect(payload.checks).not.toHaveProperty("databaseError");
  });
});
