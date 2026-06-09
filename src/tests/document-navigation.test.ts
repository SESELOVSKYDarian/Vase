import { describe, expect, it } from "vitest";
import { BUSINESS_LAUNCH_PATH } from "@/lib/business/links";
import { requiresFullDocumentNavigation } from "@/lib/navigation/document-navigation";

describe("document navigation guard", () => {
  it("uses full document navigation for cross-domain launch routes", () => {
    expect(requiresFullDocumentNavigation(BUSINESS_LAUNCH_PATH)).toBe(true);
    expect(requiresFullDocumentNavigation("/app/labs")).toBe(true);
    expect(requiresFullDocumentNavigation("/app/owner/labs")).toBe(true);
    expect(requiresFullDocumentNavigation("/app/owner/labs/activity")).toBe(true);
  });

  it("keeps normal platform routes on client navigation", () => {
    expect(requiresFullDocumentNavigation("/app")).toBe(false);
    expect(requiresFullDocumentNavigation("/app/business")).toBe(false);
    expect(requiresFullDocumentNavigation("/app/admin/users")).toBe(false);
    expect(requiresFullDocumentNavigation("/precios")).toBe(false);
  });
});
