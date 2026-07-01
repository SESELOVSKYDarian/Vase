import { describe, expect, it } from "vitest";
import { resolvePortalOrigins } from "@/config/origins";

describe("portal origins", () => {
  it("separates public, browser App, and private App origins", () => {
    expect(resolvePortalOrigins({})).toEqual({
      publicSite: "https://vase.ar",
      app: "https://app.vase.ar",
      appInternal: "https://app.vase.ar",
    });
  });
});
