import { describe, expect, it } from "vitest";
import { resolveEffectiveScope } from "../apps/vase-rest/app/lib/scopes/effective-scope";

describe("Rest effective configuration scope", () => {
  const tenant = {
    scopeType: "TENANT" as const,
    scopeId: "tenant_1",
    revision: 2,
    value: { mode: "shared" },
  };

  it("applies branch > branch group > tenant precedence with source metadata", () => {
    expect(resolveEffectiveScope({
      tenant,
      branchGroups: [{
        scopeType: "BRANCH_GROUP",
        scopeId: "group_1",
        revision: 4,
        value: { mode: "regional" },
      }],
      branch: {
        scopeType: "BRANCH",
        scopeId: "branch_1",
        revision: 7,
        value: { mode: "local" },
      },
    })).toMatchObject({
      value: { mode: "local" },
      sourceScope: "BRANCH",
      sourceRevision: 7,
      overridden: true,
    });

    expect(resolveEffectiveScope({
      tenant,
      branchGroups: [{
        scopeType: "BRANCH_GROUP",
        scopeId: "group_1",
        revision: 4,
        value: { mode: "regional" },
      }],
      branch: null,
    })).toMatchObject({ sourceScope: "BRANCH_GROUP", sourceRevision: 4 });
    expect(resolveEffectiveScope({ tenant, branchGroups: [], branch: null }))
      .toMatchObject({ sourceScope: "TENANT", overridden: false });
  });
});
