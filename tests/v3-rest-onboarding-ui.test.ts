import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Rest owner onboarding", () => {
  it("collects real branch identity, timezone and branch grouping", async () => {
    const source = await readFile(
      new URL("../apps/vase-rest/app/(owner)/onboarding/onboarding-workspace.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain('fetch("/api/v1/branches"');
    expect(source).toContain("America/Argentina/Buenos_Aires");
    expect(source).toContain("Código operativo");
    expect(source).toContain("Grupo de sucursales");
    expect(source).not.toContain("mock");
    expect(source).not.toContain("demo");
  });
});
