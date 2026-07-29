import { describe, expect, it } from "vitest";
import { effectiveRecipeItems } from "../apps/vase-rest/app/lib/catalog/effective-recipe";

describe("scoped Rest recipes", () => {
  it("resolves branch, then newest group, then tenant recipe", () => {
    const items = [
      { scopeType: "TENANT", scopeId: "tenant", scopeRevision: 1, value: "tenant" },
      { scopeType: "BRANCH_GROUP", scopeId: "group-a", scopeRevision: 2, value: "group" },
      { scopeType: "BRANCH", scopeId: "branch", scopeRevision: 3, value: "branch" },
    ];
    expect(effectiveRecipeItems({
      globalTenantId: "tenant", branchId: "branch",
      branchGroupIds: ["group-a"], items,
    })).toEqual(["branch"]);
    expect(effectiveRecipeItems({
      globalTenantId: "tenant", branchId: "other",
      branchGroupIds: ["group-a"], items,
    })).toEqual(["group"]);
    expect(effectiveRecipeItems({
      globalTenantId: "tenant", branchId: "other",
      branchGroupIds: [], items,
    })).toEqual(["tenant"]);
  });
});
