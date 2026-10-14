import { describe, expect, it } from "vitest";
import {
  buildPublicProductSearchSql,
  tokenizeSearchQuery,
} from "../apps/vase-editor/server/src/services/publicProductSearch.js";

describe("public product search", () => {
  it("normalizes accents, case and word order like the header suggestions", () => {
    expect(tokenizeSearchQuery("  Azúcar   IMPALPABLE ")).toEqual(["azucar", "impalpable"]);
    expect(tokenizeSearchQuery("Limón 100%")).toEqual(["limon", "100"]);
    expect(tokenizeSearchQuery("pc-5kg")).toEqual(["pc-5kg"]);
    expect(tokenizeSearchQuery("   ")).toEqual([]);
  });

  it("binds every term as a parameter and escapes LIKE wildcards", () => {
    const params: unknown[] = ["tenant"];
    const sql = buildPublicProductSearchSql("50%_off dulce", params);

    expect(sql).toContain("$2");
    expect(sql).not.toContain("dulce");
    expect(params).toEqual(["tenant", "%50\\%\\_off%", "%50off%", "%dulce%", "%dulce%"]);
  });

  it("adds no condition for an empty query", () => {
    const params: unknown[] = ["tenant"];
    expect(buildPublicProductSearchSql("", params)).toBe("");
    expect(params).toEqual(["tenant"]);
  });
});
