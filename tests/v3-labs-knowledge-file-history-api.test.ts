import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("knowledge file history API", () => {
  it("scopes history and creates a new revision when restoring", () => {
    const historyPath = "apps/vase-labs/app/api/labs/knowledge/files/[knowledgeId]/history/route.ts";
    const restorePath = "apps/vase-labs/app/api/labs/knowledge/files/[knowledgeId]/restore/route.ts";
    expect(existsSync(historyPath)).toBe(true);
    expect(existsSync(restorePath)).toBe(true);
    const history = readFileSync(historyPath, "utf8");
    const restore = readFileSync(restorePath, "utf8");
    expect(history).toContain("assistantId: resolved.assistant.id");
    expect(history).toContain("Original");
    expect(restore).toContain("knowledgeRevision.create");
    expect(restore).toContain("knowledgeCorrection.updateMany");
    expect(restore).toContain("active: false");
  });
});
