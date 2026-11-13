import { describe, expect, it } from "vitest";
import { isLabsNavigationItemActive, resolveLabsSection } from "../apps/vase-labs/app/app/owner/labs/labs-owner-nav";

describe("Labs navigation active item", () => {
  it("lights the menu entry that groups each screen", () => {
    expect(resolveLabsSection("/owner/inbox/trainer")).toBe("asistente");
    expect(isLabsNavigationItemActive("/owner/inbox/trainer", "/owner/knowledge")).toBe(true);
    expect(isLabsNavigationItemActive("/owner/inbox/trainer", "/owner/inbox")).toBe(false);
    expect(isLabsNavigationItemActive("/owner/inbox", "/owner/inbox")).toBe(true);
    expect(isLabsNavigationItemActive("/owner/activity", "/owner/inbox")).toBe(true);
    expect(isLabsNavigationItemActive("/owner/knowledge/catalog", "/owner/knowledge")).toBe(true);
    expect(isLabsNavigationItemActive("/owner", "/owner")).toBe(true);
    expect(isLabsNavigationItemActive("/owner/orders", "/owner")).toBe(false);
    expect(resolveLabsSection("/owner/settings")).toBe("ajustes");
  });
});
