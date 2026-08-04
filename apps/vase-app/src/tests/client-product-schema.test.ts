import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const schema = fs.readFileSync(path.resolve("prisma/schema.prisma"), "utf8");

describe("client product access schema", () => {
  it("defines commercial access, feature grants, and invitations", () => {
    expect(schema).toMatch(/enum CommercialAccessStatus\s*\{[\s\S]*TRIAL[\s\S]*ACTIVE[\s\S]*SUSPENDED[\s\S]*\}/);
    expect(schema).toContain("model ModuleFeature {");
    expect(schema).toContain("model TenantFeatureGrant {");
    expect(schema).toContain("model TenantInvitation {");

    const membership = schema.match(/model Membership\s*\{([\s\S]*?)\n\}/)?.[1];
    expect(membership).toContain("createdByUserId");

    const tenantModule = schema.match(/model TenantModule\s*\{([\s\S]*?)\n\}/)?.[1];
    const tenantSubmodule = schema.match(/model TenantSubmodule\s*\{([\s\S]*?)\n\}/)?.[1];
    expect(tenantModule).toContain("commercialStatus");
    expect(tenantSubmodule).toContain("commercialStatus");

    expect(schema).toMatch(/valueType\s+ModuleFeatureValueType\s+@default\(BOOLEAN\)/);
    expect(schema).toMatch(/model TenantInvitation\s*\{[\s\S]*?name\s+String\n[\s\S]*?invitedBy\s+User\s+@relation\(fields: \[invitedByUserId\], references: \[id\], onDelete: Cascade\)/);
  });
});
