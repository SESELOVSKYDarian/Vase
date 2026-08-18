import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("knowledge file history UI", () => {
  it("adds an accessible history drawer and restore action to files", () => {
    const componentPath = "apps/vase-labs/app/app/owner/labs/chatbots/knowledge-file-history.tsx";
    expect(existsSync(componentPath)).toBe(true);
    const component = readFileSync(componentPath, "utf8");
    const groups = readFileSync("apps/vase-labs/app/app/owner/labs/chatbots/knowledge-groups.tsx", "utf8");
    expect(groups).toContain("KnowledgeFileHistory");
    expect(component).toContain("Historial de archivo");
    expect(component).toContain("Restaurar esta versión");
    expect(component).toContain('aria-modal="true"');
    expect(component).toContain("/restore");
  });
});
