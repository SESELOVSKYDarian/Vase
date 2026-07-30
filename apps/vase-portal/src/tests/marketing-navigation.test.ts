import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

describe("Portal marketing navigation", () => {
  it("keeps the navbar visible independently from animated sections", () => {
    const header = source("src/components/marketing/site-header-client.tsx");
    const features = source("src/components/marketing/unified-features.tsx");

    expect(header).toContain('"fixed inset-x-0 top-0 z-50');
    expect(header).not.toContain("vase:features-visibility");
    expect(features).not.toContain("vase:features-visibility");
  });

  it("links the contact page from the header and footer", () => {
    const header = source("src/components/marketing/site-header-client.tsx");
    const footer = source("src/components/marketing/site-footer.tsx");

    expect(header).toContain('link: "/contact"');
    expect(footer).toContain('href="/contact"');
  });
});
