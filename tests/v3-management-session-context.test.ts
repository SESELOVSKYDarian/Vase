import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  createManagementSessionContextService,
  mapManagementSessionContextError,
} from "../apps/vase-app/src/server/services/management-session-context";

const routeSource = readFileSync(
  new URL(
    "../apps/vase-app/src/app/api/internal/management/session-context/route.ts",
    import.meta.url,
  ),
  "utf8",
);

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

  it("rejects malformed stored identity roles", async () => {
    const service = createManagementSessionContextService({
      findAccess: vi.fn().mockResolvedValue({
        ...membership,
        identityLinkRole: "ADMINISTRATOR",
      }),
    });

    await expect(service.resolve({ globalUserId: "user_123" })).rejects.toThrow("MANAGEMENT_NOT_ENTITLED");
  });

  it("allows a missing identity link and derives Management role from tenant role", async () => {
    const service = createManagementSessionContextService({
      findAccess: vi.fn().mockResolvedValue({
        ...membership,
        tenantRole: "MEMBER",
        identityLinkActive: null,
        identityLinkRole: null,
      }),
    });

    await expect(service.resolve({ globalUserId: "user_123" })).resolves.toMatchObject({
      tenantRole: "MEMBER",
      managementRole: "MEMBER",
    });
  });

  it("maps only approved public route errors", () => {
    expect(mapManagementSessionContextError(new Error("FORBIDDEN"))).toEqual({
      error: "FORBIDDEN",
      status: 403,
      logUnexpected: false,
    });
    expect(mapManagementSessionContextError(new Error("MANAGEMENT_NOT_ENTITLED"))).toEqual({
      error: "MANAGEMENT_NOT_ENTITLED",
      status: 403,
      logUnexpected: false,
    });
    expect(mapManagementSessionContextError(new Error("SERVICE_TOKEN_NOT_CONFIGURED"))).toEqual({
      error: "SERVICE_TOKEN_NOT_CONFIGURED",
      status: 503,
      logUnexpected: false,
    });
    expect(mapManagementSessionContextError(new Error("database connection details"))).toEqual({
      error: "MANAGEMENT_SESSION_CONTEXT_FAILED",
      status: 500,
      logUnexpected: true,
    });
    expect(mapManagementSessionContextError("non-error rejection")).toEqual({
      error: "MANAGEMENT_SESSION_CONTEXT_FAILED",
      status: 500,
      logUnexpected: true,
    });
  });
});

describe("Management session context route wiring", () => {
  it("applies the compatible per-user Management module policy", () => {
    expect(routeSource).toContain('buildCompatibleUserModuleAccessWhere("vase_management")');
  });

  it("uses the public error mapper and logs unexpected details server-side", () => {
    expect(routeSource).toContain("mapManagementSessionContextError(error)");
    expect(routeSource).toContain(
      'console.error("[management-session-context] unexpected error", error)',
    );
  });
});
