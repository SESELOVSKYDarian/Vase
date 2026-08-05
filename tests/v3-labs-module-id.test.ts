import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Vase Labs module identity", () => {
  it("uses the canonical vase_labs module for authorization and enablement", () => {
    const sessionContextRoute = fs.readFileSync(
      path.resolve("apps/vase-app/src/app/api/internal/labs/session-context/route.ts"),
      "utf8",
    );
    const sessionContextService = fs.readFileSync(
      path.resolve("apps/vase-app/src/server/services/labs-session-context.ts"),
      "utf8",
    );
    const enableLabsScript = fs.readFileSync(
      path.resolve("apps/vase-app/scripts/enable-labs.ts"),
      "utf8",
    );

    expect(`${sessionContextRoute}\n${sessionContextService}`).toContain('moduleId: "vase_labs"');
    expect(`${sessionContextRoute}\n${sessionContextService}`).not.toContain('moduleId: "labs"');
    expect(enableLabsScript).toContain('id: "vase_labs"');
    expect(enableLabsScript).not.toContain('id: "labs"');
    expect(enableLabsScript).toContain('moduleId: "vase_labs"');
    expect(enableLabsScript).not.toContain('moduleId: "labs"');
  });
});
