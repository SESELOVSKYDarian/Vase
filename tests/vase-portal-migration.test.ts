import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const portal = path.resolve("apps/vase-portal");

describe("Vase Portal migration", () => {
  it("contains the production marketing foundation", () => {
    for (const relativePath of [
      "src/app/layout.tsx",
      "src/app/globals.css",
      "src/components/marketing/site-header.tsx",
      "src/components/marketing/site-footer.tsx",
      "src/components/marketing/staggered-menu.tsx",
      "src/config/public-site.ts",
      "public/vasecolorlogo.png",
    ]) {
      expect(fs.existsSync(path.join(portal, relativePath)), relativePath).toBe(
        true,
      );
    }
  });

  it("uses a src-based App Router without the placeholder root app", () => {
    expect(fs.existsSync(path.join(portal, "app"))).toBe(false);
    expect(fs.existsSync(path.join(portal, "src", "app"))).toBe(true);
  });
});
