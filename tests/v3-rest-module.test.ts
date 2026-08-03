import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getPlatformModuleByKey } from "../apps/vase-app/src/config/modules";
import {
  getUserAccessModuleLabel,
  userAccessModuleIds,
} from "../apps/vase-app/src/lib/admin/user-access";

describe("Vase Rest module registration", () => {
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
    const route = fs.readFileSync(
      path.resolve("apps/vase-app/src/app/api/internal/admin/rest/plans/route.ts"),
      "utf8",
    );
    expect(route).toContain("tenantModule.upsert");
    expect(route).toContain('moduleId: "vase_rest"');
    expect(route).toContain("activatedAt: new Date()");
    expect(route).toContain("ensureModuleCatalogSynced");
  });

  it("registers Rest as an assignable user module with its own label", () => {
    expect(userAccessModuleIds.rest).toBe("vase_rest");
    expect(getUserAccessModuleLabel(userAccessModuleIds.rest)).toBe("Vase Rest");
  });

  it("allows a superadmin to grant and revoke Rest for an active tenant member", () => {
    const route = fs.readFileSync(
      path.resolve("apps/vase-app/src/app/api/internal/admin/rest/plans/route.ts"),
      "utf8",
    );
    expect(route).toContain('action: z.literal("SET_USER_ACCESS")');
    expect(route).toContain("userModuleAccess.upsert");
    expect(route).toContain('moduleId: "vase_rest"');
    expect(route).toContain("REST_CONTRACT_REQUIRED");
  });

  it("exposes assignable tenants and their users to authenticated Vase Admin", () => {
    const route = fs.readFileSync(
      path.resolve("apps/vase-app/src/app/api/internal/admin/rest/plans/route.ts"),
      "utf8",
    );
    expect(route).toContain("contractTenants");
    expect(route).toContain("memberships");
    expect(route).toContain("restContract");

    const adminPage = fs.readFileSync(
      path.resolve("apps/vase-admin/app/page.tsx"),
      "utf8",
    );
    expect(adminPage).toContain("requireAdminSession");
    expect(adminPage).not.toContain("ADMIN_ACTOR_USER_ID");
  });
});
