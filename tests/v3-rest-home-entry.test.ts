import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Rest home entry", () => {
  it("resolves an authenticated owner before rendering the public landing", () => {
    const source = fs.readFileSync(
      path.resolve("apps/vase-rest/app/page.tsx"),
      "utf8",
    );

    expect(source).toContain('import { headers } from "next/headers"');
    expect(source).toContain('import { redirect } from "next/navigation"');
    expect(source).toContain("resolveRestOwnerRequest");
    expect(source).toContain('redirect("/owner")');
  });
});
