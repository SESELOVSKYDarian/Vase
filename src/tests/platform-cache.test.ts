import { describe, expect, it } from "vitest";
import { shouldDisablePlatformCache } from "@/lib/security/platform-cache";

describe("platform cache controls", () => {
  it("disables browser caching for every authenticated app workspace", () => {
    expect(shouldDisablePlatformCache("/app/admin")).toBe(true);
    expect(shouldDisablePlatformCache("/app/support")).toBe(true);
    expect(shouldDisablePlatformCache("/app/owner")).toBe(true);
    expect(shouldDisablePlatformCache("/app/business")).toBe(true);
  });

  it("keeps public storefront paths cacheable by middleware", () => {
    expect(shouldDisablePlatformCache("/sites/example.com")).toBe(false);
    expect(shouldDisablePlatformCache("/catalog")).toBe(false);
  });
});
