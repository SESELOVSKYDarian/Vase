import { describe, expect, it, vi } from "vitest";
import { createManagementSessionContextService } from "../apps/vase-app/src/server/services/management-session-context";

const membership = {
  globalUserId: "user_123",
  email: "owner@example.com",
  name: "Owner",
  platformRole: "USER" as const,
  globalTenantId: "tenant_123",
  tenantSlug: "norte-equipos",
  tenantName: "Norte Equipos",
  tenantRole: "OWNER" as const,
  moduleStatus: "ACTIVE" as const,
  userModuleActive: true,
  identityLinkActive: true,
  identityLinkRole: "OWNER",
};

describe("Management session context service", () => {
  it("maps central membership into Management authorization", async () => {
    const service = createManagementSessionContextService({
      findAccess: vi.fn().mockResolvedValue(membership),
      now: () => new Date("2026-08-17T20:00:00.000Z"),
    });
    await expect(service.resolve({ globalUserId: "user_123" })).resolves.toMatchObject({
      globalTenantId: "tenant_123",
      tenantRole: "OWNER",
      managementRole: "ADMINISTRATOR",
      entitlement: { status: "ACTIVE" },
    });
  });

  it("rejects missing, suspended, or explicitly disabled access", async () => {
    for (const access of [
      null,
      { ...membership, moduleStatus: "SUSPENDED" as const },
      { ...membership, userModuleActive: false },
      { ...membership, identityLinkActive: false },
    ]) {
      const service = createManagementSessionContextService({
        findAccess: vi.fn().mockResolvedValue(access),
      });
      await expect(service.resolve({ globalUserId: "user_123" })).rejects.toThrow("MANAGEMENT_NOT_ENTITLED");
    }
  });
});
