import { describe, expect, it } from "vitest";
import {
  isInboxNearBottom,
  shouldAutoScrollInbox,
  restoreInboxScrollOffset,
} from "../apps/vase-labs/app/app/owner/labs/inbox/inbox-scroll-policy";

describe("Labs Inbox scroll policy", () => {
  it("treats the final 80 pixels as near the bottom", () => {
    expect(isInboxNearBottom({
      scrollHeight: 1000,
      scrollTop: 520,
      clientHeight: 400,
    })).toBe(true);
    expect(isInboxNearBottom({
      scrollHeight: 1000,
      scrollTop: 519,
      clientHeight: 400,
    })).toBe(false);
  });

  it("does not steal scroll position during polling while reading history", () => {
    expect(shouldAutoScrollInbox({
      conversationChanged: false,
      operatorSent: false,
      messagesAdded: true,
      wasNearBottom: false,
    })).toBe(false);
  });

  it("follows new messages only when already near the bottom", () => {
    expect(shouldAutoScrollInbox({
      conversationChanged: false,
      operatorSent: false,
      messagesAdded: true,
      wasNearBottom: true,
    })).toBe(true);
  });

  it("always scrolls after changing conversation or sending a message", () => {
    expect(shouldAutoScrollInbox({
      conversationChanged: true,
      operatorSent: false,
      messagesAdded: false,
      wasNearBottom: false,
    })).toBe(true);
    expect(shouldAutoScrollInbox({
      conversationChanged: false,
      operatorSent: true,
      messagesAdded: true,
      wasNearBottom: false,
    })).toBe(true);
  });

  it("preserves the visible reading offset when polling adds content", () => {
    expect(restoreInboxScrollOffset({ scrollTop: 280, scrollHeight: 1200 }, 1320)).toBe(400);
  });
});
