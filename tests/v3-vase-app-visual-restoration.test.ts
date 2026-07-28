import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function source(relativePath: string) {
  return fs.readFileSync(path.resolve(relativePath), "utf8");
}

describe("Vase App migration-branch visual source", () => {
  it("keeps the fd54455 application shell composition", () => {
    const shell = source("apps/vase-app/src/components/layout/app-shell.tsx");

    expect(shell).toContain("fixed left-0 top-0 z-40 hidden h-screen w-64");
    expect(shell).toContain("rounded-xl px-4 py-3");
    expect(shell).toContain("vasecolorlogo.png");
    expect(shell).toContain("Vase Business");
    expect(shell).toContain("Vase Labs");
  });

  it("keeps the fd54455 marketing composition while routing to the public service", () => {
    const header = source("apps/vase-app/src/components/marketing/site-header-client.tsx");
    const footer = source("apps/vase-app/src/components/marketing/site-footer.tsx");
    const menu = source("apps/vase-app/src/components/marketing/staggered-menu.tsx");
    const navigation = source("apps/vase-app/src/lib/navigation/document-navigation.ts");

    expect(header).toContain("rounded-full border border-white/60");
    expect(footer).toContain("lg:grid-cols-[0.95fr_0.8fr_0.8fr_0.7fr]");
    expect(menu).toContain("vm-nav-itemLabel");
    expect(header).toContain("resolveAppHomeHref");
    expect(navigation).toContain("productOrigins.publicSite");
  });

  it("renders later Business controls in the established builder language", () => {
    const builder = source("apps/vase-app/src/components/business/builder-editor.tsx");

    expect(builder).toContain("SEO del sitio");
    expect(builder).toContain("rounded-[28px] border border-[var(--border-subtle)]");
    expect(builder).toContain("Google Tag Manager");
  });
});
