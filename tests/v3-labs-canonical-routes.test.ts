import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const labs = path.resolve("apps/vase-labs");

describe("Labs canonical owner routes", () => {
  it("serves the short owner routes and permanently redirects legacy URLs", () => {
    for (const route of ["page.tsx", "inbox/page.tsx", "activity/page.tsx", "knowledge/page.tsx", "knowledge/catalog/page.tsx", "channels/page.tsx", "settings/page.tsx"]) {
      expect(fs.existsSync(path.join(labs, "app/owner", route)), route).toBe(true);
    }
    const config = fs.readFileSync(path.join(labs, "next.config.ts"), "utf8");
    expect(config).toContain('source: "/app/owner/labs/:path*"');
    expect(config).toContain('destination: "/owner/:path*"');
    expect(config).toContain("permanent: true");
  });

  it("uses canonical links in the Labs owner navigation", () => {
    const nav = fs.readFileSync(path.join(labs, "app/app/owner/labs/labs-owner-nav.tsx"), "utf8");
    expect(nav).toContain('href: "/owner/channels"');
    expect(nav).toContain('href: "/owner/knowledge"');
    expect(nav).not.toContain('href: "/app/owner/labs');
  });
});
