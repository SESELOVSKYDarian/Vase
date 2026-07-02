import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const portal = path.resolve("apps/vase-portal");

describe("Vase Portal migration", () => {
  it("packages Portal from the monorepo root for EasyPanel", () => {
    const dockerfile = fs.readFileSync(
      path.join(portal, "Dockerfile"),
      "utf8",
    );
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(portal, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };

    expect(dockerfile).toContain("COPY tsconfig.base.json");
    expect(dockerfile).toContain(
      "npm run build --workspace @vase/portal",
    );
    expect(dockerfile).toContain("ENV PORT=3000");
    expect(dockerfile).toContain("EXPOSE 3000");
    expect(packageJson.scripts.dev).toContain("--port 3000");
    expect(packageJson.scripts.start).toContain("--port 3000");
  });

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
