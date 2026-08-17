import { describe, expect, it } from "vitest";
import { managementSessionContextSchema } from "../packages/contracts/src/index";

const validContext = {
  globalUserId: "user_123",
  email: "owner@example.com",
  name: "Owner",
  platformRole: "USER",
  globalTenantId: "tenant_123",
  tenantSlug: "norte-equipos",
  tenantName: "Norte Equipos",
  tenantRole: "OWNER",
  managementRole: "ADMINISTRATOR",
  entitlement: { status: "ACTIVE" },
  resolvedAt: "2026-08-17T20:00:00.000Z",
};

describe("Management session context contract", () => {
  it("accepts the allowlisted central identity payload", () => {
    expect(managementSessionContextSchema.parse(validContext)).toEqual(validContext);
  });

  it("rejects secrets and unsupported roles", () => {
    expect(() => managementSessionContextSchema.parse({
      ...validContext,
      managementRole: "SUPERUSER",
    })).toThrow();
    expect(() => managementSessionContextSchema.parse({
      ...validContext,
      passwordHash: "must-not-cross-services",
    })).toThrow();
  });
});
