import { readSplitSync } from "../apps/vase-editor/web/tests/helpers/read-split.mjs";
import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("Shared panel shell (app.vase.ar and Labs)", () => {
  it("uses one shell with a collapsible menu for every panel", () => {
    const shell = readSplitSync("packages/ui/src/panel/shell.tsx");
    const styles = readSplitSync("packages/ui/src/panel.css");
    const labsShell = readSplitSync("apps/vase-labs/app/app/owner/labs/labs-shell.tsx");
    const appShell = readSplitSync("apps/vase-app/src/components/layout/client-shell.tsx");

    expect(shell).toContain("localStorage");
    expect(shell).toContain("<PanelSidebar");
    const sidebar = readSplitSync("packages/ui/src/panel/sidebar.tsx");
    expect(sidebar).toContain("vase-side-coll");
    expect(sidebar).toContain("Achicar el menú");
    expect(sidebar).toContain("aria-expanded");
    expect(readSplitSync("packages/ui/src/components.css")).toContain(".vase-side.mini");
    expect(readSplitSync("apps/vase-editor/web/src/panel/components/Shell.jsx")).toContain("<PanelSidebar");
    expect(styles).toContain('@import "./tokens.css";');
    expect(readSplitSync("packages/ui/src/tokens.css")).toContain(":root[data-theme=\"dark\"] .vpa");
    expect(labsShell).toContain("<PanelShell");
    expect(labsShell).toContain('storageKey="vase-labs-mini"');
    expect(labsShell).toContain("/api/labs/signout");
    expect(appShell).toContain("<PanelShell");
    expect(appShell).toContain('import "@vase/ui/panel.css"');
    expect(fs.existsSync("apps/vase-labs/app/api/labs/signout/route.ts")).toBe(true);
  });
});
