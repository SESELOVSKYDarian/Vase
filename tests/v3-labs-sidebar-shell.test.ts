import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("Shared panel shell (app.vase.ar and Labs)", () => {
  it("uses one shell with a collapsible menu for every panel", () => {
    const shell = fs.readFileSync("packages/ui/src/panel/shell.tsx", "utf8");
    const styles = fs.readFileSync("packages/ui/src/panel.css", "utf8");
    const labsShell = fs.readFileSync("apps/vase-labs/app/app/owner/labs/labs-shell.tsx", "utf8");
    const appShell = fs.readFileSync("apps/vase-app/src/components/layout/client-shell.tsx", "utf8");

    expect(shell).toContain("localStorage");
    expect(shell).toContain("vpa-coll");
    expect(shell).toContain("Achicar el menú");
    expect(shell).toContain("aria-expanded");
    expect(styles).toContain(".vpa-side.mini");
    expect(styles).toContain('@import "./tokens.css";');
    expect(fs.readFileSync("packages/ui/src/tokens.css", "utf8")).toContain(":root[data-theme=\"dark\"] .vpa");
    expect(labsShell).toContain("<PanelShell");
    expect(labsShell).toContain('storageKey="vase-labs-mini"');
    expect(labsShell).toContain("/api/labs/signout");
    expect(appShell).toContain("<PanelShell");
    expect(appShell).toContain('import "@vase/ui/panel.css"');
    expect(fs.existsSync("apps/vase-labs/app/api/labs/signout/route.ts")).toBe(true);
  });
});
