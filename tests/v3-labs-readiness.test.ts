import { describe, expect, it } from "vitest";
import { getLabsReadinessPayload } from "../apps/vase-labs/app/lib/labs-readiness";

describe("Vase Labs readiness", () => {
  it("reports ok when the database ping succeeds", async () => {
    const payload = await getLabsReadinessPayload({
      pingDatabase: async () => undefined,
      now: new Date("2026-06-25T00:00:00.000Z"),
    });

    expect(payload.status).toBe("ok");
    expect(payload.checks.database).toBe("postgres-labs");
  });

  it("reports degraded when the database ping fails", async () => {
    const payload = await getLabsReadinessPayload({
      pingDatabase: async () => {
        throw new Error("database unavailable");
      },
      now: new Date("2026-06-25T00:00:00.000Z"),
    });

    expect(payload.status).toBe("degraded");
    expect(payload.checks.database).toBe("error");
    expect(payload.checks.databaseError).toBe("database unavailable");
  });
});
