import { describe, expect, it } from "vitest";
import { hasPlatformRole, hasTenantRole } from "@/lib/auth/roles";

describe("authorization helpers", () => {
  it("allows hierarchical tenant access", () => {
    expect(hasTenantRole("OWNER", "MANAGER")).toBe(true);
    expect(hasTenantRole("MEMBER", "MANAGER")).toBe(false);
  });

  it("allows hierarchical platform access", () => {
    expect(hasPlatformRole("SUPER_ADMIN", "SUPPORT")).toBe(true);
    expect(hasPlatformRole("USER", "SUPPORT")).toBe(false);
  });
});
