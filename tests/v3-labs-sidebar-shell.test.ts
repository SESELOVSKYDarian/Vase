import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("Labs collapsible sidebar", () => {
  it("persists a pinned desktop sidebar while retaining hover expansion", () => {
    const shell = fs.readFileSync("apps/vase-labs/app/app/owner/labs/labs-sidebar-shell.tsx", "utf8");
    const nav = fs.readFileSync("apps/vase-labs/app/app/owner/labs/labs-owner-nav.tsx", "utf8");
    const styles = fs.readFileSync("apps/vase-labs/app/globals.css", "utf8");
    expect(shell).toContain("localStorage");
    expect(shell).toContain("labs-sidebar-pinned");
    expect(shell).toContain("aria-expanded");
    expect(styles).toContain(".labs-sidebar-frame:hover");
    expect(styles).toContain(".labs-sidebar-frame:focus-within");
    expect(shell).toContain("Buscar en Labs");
    expect(shell).toContain("Cambiar tema");
    expect(shell).toContain("vase-labs-theme");
    expect(nav).toContain("FlaskConical");
    expect(styles).toContain(".labs-topbar");
    expect(fs.existsSync("apps/vase-labs/app/api/labs/signout/route.ts")).toBe(true);
  });
});
