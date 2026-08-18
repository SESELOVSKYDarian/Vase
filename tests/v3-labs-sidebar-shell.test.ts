import fs from "node:fs";
import { describe, expect, it } from "vitest";

describe("Labs collapsible sidebar", () => {
  it("persists a pinned desktop sidebar while retaining hover expansion", () => {
    const shell = fs.readFileSync("apps/vase-labs/app/app/owner/labs/labs-sidebar-shell.tsx", "utf8");
    const styles = fs.readFileSync("apps/vase-labs/app/globals.css", "utf8");
    expect(shell).toContain("localStorage");
    expect(shell).toContain("labs-sidebar-pinned");
    expect(shell).toContain("aria-expanded");
    expect(styles).toContain(".labs-sidebar-frame:hover");
    expect(styles).toContain(".labs-sidebar-frame:focus-within");
  });
});
