import { hash } from "bcryptjs";
import { describe, expect, it, vi } from "vitest";
import { createPinAuthService } from "../apps/vase-rest/app/lib/staff/pin-auth";

describe("Rest quick PIN access", () => {
  it("creates an individual opaque staff session bound to branch and device", async () => {
    const pinHash = await hash("1842", 4);
    const recordFailure = vi.fn();
    const createSession = vi.fn(async (input) => ({
      token: "opaque-session-token",
      expiresAt: input.expiresAt,
    }));
    const service = createPinAuthService({
      findEmployee: async () => ({
        id: "staff_1",
        displayName: "María",
        pinHash,
        active: true,
        lockedUntil: null,
        roles: [{ branchId: "branch_1", role: "WAITER" }],
      }),
      recordFailure,
      clearFailures: vi.fn(),
      createSession,
    }, { sessionSecret: "staff-session-secret-with-32-characters" });

    const result = await service.authenticate({
      globalTenantId: "tenant_1",
      branchId: "branch_1",
      deviceId: "device_1",
      employeeCode: "MARI",
      pin: "1842",
    });
    expect(result.sessionToken).toBe("opaque-session-token");
    expect(result.staff.roles[0]?.role).toBe("WAITER");
    expect(result.staff).not.toHaveProperty("pinHash");
    expect(recordFailure).not.toHaveBeenCalled();
  });

  it("records invalid attempts, rejects unassigned branches and respects lockout", async () => {
    const pinHash = await hash("1842", 4);
    const recordFailure = vi.fn(async () => undefined);
    const repository = {
      findEmployee: async () => ({
        id: "staff_1",
        displayName: "María",
        pinHash,
        active: true,
        lockedUntil: null,
        roles: [{ branchId: "branch_1", role: "WAITER" as const }],
      }),
      recordFailure,
      clearFailures: vi.fn(),
      createSession: vi.fn(),
    };
    const service = createPinAuthService(repository, {
      sessionSecret: "staff-session-secret-with-32-characters",
    });
    await expect(service.authenticate({
      globalTenantId: "tenant_1",
      branchId: "branch_1",
      deviceId: "device_1",
      employeeCode: "MARI",
      pin: "9999",
    })).rejects.toThrow("REST_PIN_INVALID");
    expect(recordFailure).toHaveBeenCalledWith("tenant_1", "staff_1", 5);

    await expect(service.authenticate({
      globalTenantId: "tenant_1",
      branchId: "branch_2",
      deviceId: "device_1",
      employeeCode: "MARI",
      pin: "1842",
    })).rejects.toThrow("REST_STAFF_BRANCH_FORBIDDEN");
  });
});
