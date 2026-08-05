import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Rest project navigation", () => {
  it("exposes Vase Rest in the client Projects menu when its module is active", () => {
    const source = fs.readFileSync(
      path.resolve("src/components/layout/app-shell.tsx"),
      "utf8",
    );

    expect(source).toContain("restModuleActive");
    expect(source).toContain('id: "projects-rest"');
    expect(source).toContain('href: "https://rest.vase.ar"');
  });
});
