import { describe, expect, it } from "vitest";
import { BUSINESS_LAUNCH_PATH } from "@/lib/business/links";
import {
  requiresFullDocumentNavigation,
  resolveAppHomeHref,
  resolveNavigationHrefForHost,
  resolveShortcutHref,
} from "@/lib/navigation/document-navigation";

describe("document navigation guard", () => {
  it("uses full document navigation for cross-domain launch routes", () => {
    expect(requiresFullDocumentNavigation(BUSINESS_LAUNCH_PATH)).toBe(true);
    expect(requiresFullDocumentNavigation("/app/labs")).toBe(true);
    expect(requiresFullDocumentNavigation("/app/labs#knowledge")).toBe(true);
    expect(requiresFullDocumentNavigation("/app/owner/labs")).toBe(true);
    expect(requiresFullDocumentNavigation("/app/owner/labs/activity")).toBe(true);
  });

  it("keeps normal platform routes on client navigation", () => {
    expect(requiresFullDocumentNavigation("/app")).toBe(false);
    expect(requiresFullDocumentNavigation("/app/labs/starter")).toBe(true);
    expect(requiresFullDocumentNavigation("/app/business")).toBe(false);
    expect(requiresFullDocumentNavigation("/app/admin/users")).toBe(false);
    expect(requiresFullDocumentNavigation("/precios")).toBe(false);
  });

  it("resolves the public Home and Home shortcut", () => {
    expect(resolveAppHomeHref()).toBe("https://vase.ar");
    expect(resolveShortcutHref("goto_home", "/app")).toBe("https://vase.ar");
    expect(resolveShortcutHref("goto_settings", "/app/settings")).toBe(
      "/app/settings",
    );
  });

  it("keeps Labs routes on the Labs host and sends non-Labs routes to the primary host", () => {
    expect(resolveNavigationHrefForHost("/app/labs", "labs.vase.ar")).toBe("/app/labs");
    expect(resolveNavigationHrefForHost("/app/labs#knowledge", "labs.vase.ar")).toBe("/app/labs#knowledge");
    expect(resolveNavigationHrefForHost("/app/labs/starter", "labs.vase.ar")).toBe("/app/labs/starter");
    expect(resolveNavigationHrefForHost("/app/help", "labs.vase.ar")).toBe("/app/owner/labs");
    expect(resolveNavigationHrefForHost("/app/owner/labs/activity", "labs.vase.ar")).toBe("/app/owner/labs/activity");
    expect(resolveNavigationHrefForHost("/precios", "labs.vase.ar")).toBe("/app/owner/labs");
    expect(resolveNavigationHrefForHost("/app/help", "vase.ar")).toBe("/app/help");
  });
});
