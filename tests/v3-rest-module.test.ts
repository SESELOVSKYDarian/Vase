import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getPlatformModuleByKey } from "../apps/vase-app/src/config/modules";
import {
  getUserAccessModuleLabel,
  userAccessModuleIds,
} from "../apps/vase-app/src/lib/admin/user-access";

describe("Vase Rest module registration", () => {
  const readRestAdminService = () => fs.readFileSync(
    path.resolve("apps/vase-app/src/server/services/rest-admin.ts"),
    "utf8",
  );

  it("registers the automatic Rest launcher in Vase App", () => {
    expect(getPlatformModuleByKey("rest")).toMatchObject({
      id: "vase_rest",
      key: "rest",
      product: "REST",
      route: "https://rest.vase.ar",
      activationMode: "automatic",
    });
  });

  it("persists REST as a first-class module product", () => {
    const schema = fs.readFileSync(path.resolve("apps/vase-app/prisma/schema.prisma"), "utf8");
    expect(schema).toMatch(/enum ModuleProduct\s*\{[^}]*REST/s);
    expect(schema).toContain("model RestPricingVersion");
    expect(schema).toContain("model TenantRestContract");
  });

  it("activates the tenant module when a Rest contract is accepted", () => {
    const service = readRestAdminService();
    expect(service).toContain("tenantModule.upsert");
    expect(service).toContain('moduleId: "vase_rest"');
    expect(service).toContain("activatedAt: moduleActivatedAt");
    expect(service).toContain("ensureModuleCatalogSynced");
  });

  it("registers Rest as an assignable user module with its own label", () => {
    expect(userAccessModuleIds.rest).toBe("vase_rest");
    expect(getUserAccessModuleLabel(userAccessModuleIds.rest)).toBe("Vase Rest");
  });

  it("allows a superadmin to grant and revoke Rest for an active tenant member", () => {
    const service = readRestAdminService();
    expect(service).toContain('action: z.literal("SET_USER_ACCESS")');
    expect(service).toContain("userModuleAccess.upsert");
    expect(service).toContain('moduleId: "vase_rest"');
    expect(service).toContain("REST_CONTRACT_REQUIRED");
  });

  it("exposes assignable tenants and their users to authenticated Vase Admin", () => {
    const service = readRestAdminService();
    expect(service).toContain("contractTenants");
    expect(service).toContain("memberships");
    expect(service).toContain("restContract");

    const browserRoute = fs.readFileSync(
      path.resolve("apps/vase-app/src/app/api/admin/rest/plans/route.ts"),
      "utf8",
    );
    expect(browserRoute).toContain('requireVerifiedPlatformRole("SUPER_ADMIN")');
    expect(browserRoute).not.toContain("ADMIN_ACTOR_USER_ID");

    const adminPage = fs.readFileSync(
      path.resolve("apps/vase-app/src/app/(platform)/app/admin/rest/page.tsx"),
      "utf8",
    );
    expect(adminPage).toContain("RestAdminWorkspace");
  });
});
