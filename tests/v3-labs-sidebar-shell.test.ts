import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("Labs collapsible sidebar", () => {
  it("persists an explicit desktop expansion while preserving a usable icon rail", () => {
    const shell = fs.readFileSync("apps/vase-labs/app/app/owner/labs/labs-sidebar-shell.tsx", "utf8");
    const nav = fs.readFileSync("apps/vase-labs/app/app/owner/labs/labs-owner-nav.tsx", "utf8");
    const styles = fs.readFileSync("apps/vase-labs/app/globals.css", "utf8");
    expect(shell).toContain("localStorage");
    expect(shell).toContain("labs-sidebar-pinned");
    expect(shell).toContain("aria-expanded");
    expect(styles).not.toContain(".labs-sidebar-frame:hover, .labs-sidebar-frame:focus-within");
    expect(shell).toContain("Buscar en Labs");
    expect(shell).toContain("Cambiar tema");
    expect(shell).toContain("vase-labs-theme");
    expect(styles).toContain('[data-theme="dark"]');
    expect(styles).toContain("--background: #101513");
    expect(shell).toContain("PanelLeftOpen");
    expect(shell).toContain("labs-topbar-title");
    expect(shell).toContain("labs-mobile-topbar");
    expect(shell).toContain("mobileMenuOpen");
    expect(nav).toContain("FlaskConical");
    expect(styles).toContain(".labs-topbar");
    expect(styles).toContain(".labs-mobile-menu");
    expect(styles).toContain(".labs-sidebar-pinned .labs-owner-nav-link");
    expect(fs.existsSync("apps/vase-labs/app/api/labs/signout/route.ts")).toBe(true);
  });
});
