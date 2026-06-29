import { describe, expect, it } from "vitest";
import {
  createInitialBuilderDocument,
  getBuilderCapabilities,
  normalizeBuilderDocument,
} from "@/lib/business/builder";

describe("builder rules", () => {
  it("limits temporary pages to base palettes and blocks", () => {
    const capabilities = getBuilderCapabilities({
      isTemporary: true,
      plan: "START",
    });

    expect(capabilities.availablePalettes).toEqual(["linen", "graphite"]);
    expect(capabilities.availableBlockTypes).not.toContain("gallery");
  });

  it("normalizes unsupported blocks for temporary pages", () => {
    const capabilities = getBuilderCapabilities({
      isTemporary: true,
      plan: "START",
    });
    const document = createInitialBuilderDocument("CATALOG");
    const normalized = normalizeBuilderDocument(document, capabilities);

    expect(normalized.templateKey).toBe("STARTER");
    expect(normalized.blocks.some((block) => block.type === "gallery")).toBe(false);
  });
});
