import { describe, expect, it } from "vitest";
import { isLabsNavigationItemActive } from "../apps/vase-labs/app/app/owner/labs/labs-owner-nav";

describe("Labs navigation active item", () => {
  it("marks trainer as active without also activating Inbox", () => {
    expect(isLabsNavigationItemActive("/owner/inbox/trainer", "/owner/inbox/trainer")).toBe(true);
    expect(isLabsNavigationItemActive("/owner/inbox/trainer", "/owner/inbox")).toBe(false);
  });
});
