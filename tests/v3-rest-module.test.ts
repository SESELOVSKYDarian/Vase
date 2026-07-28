import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getPlatformModuleByKey } from "../apps/vase-app/src/config/modules";

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
  });
});
