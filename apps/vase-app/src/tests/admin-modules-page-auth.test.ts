import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(
  new URL("../app/(platform)/app/admin/modules/page.tsx", import.meta.url),
  "utf8",
);

describe("admin modules page authorization", () => {
  it("uses the dedicated MODULES permission instead of a SUPER_ADMIN-only guard", () => {
    expect(pageSource).toContain('requireAdminPermission(adminPermissions.MODULES)');
    expect(pageSource).not.toContain("requireVerifiedPlatformRole(platformRoles.SUPER_ADMIN)");
  });
});
