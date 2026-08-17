import { describe, expect, it } from "vitest";
import { resolveManagementOrigin } from "../apps/vase-app/src/lib/management/links";

describe("Management links", () => {
  it("uses the V3 Management port locally when no origin is configured", () => {
    expect(resolveManagementOrigin(undefined)).toBe("http://localhost:3006");
  });

  it("preserves the configured Management origin", () => {
    expect(resolveManagementOrigin("https://management.vase.ar/")).toBe("https://management.vase.ar");
  });
});
