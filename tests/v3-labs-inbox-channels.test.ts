import { describe, expect, it } from "vitest";
import {
  countInboxConversationsByChannel,
  filterInboxConversationsByChannel,
  normalizeInboxChannel,
} from "../apps/vase-labs/app/app/owner/labs/inbox/inbox-channels";

const conversations = [
  { id: "wa", channel: "WHATSAPP" },
  { id: "ig", channel: "INSTAGRAM" },
  { id: "fb", channel: "FACEBOOK" },
  { id: "legacy-fb", channel: "MESSENGER" },
  { id: "unknown", channel: null },
];

describe("Labs Inbox channel navigation", () => {
  it("normalizes historical Messenger conversations as Facebook chats", () => {
    expect(normalizeInboxChannel("MESSENGER")).toBe("FACEBOOK");
    expect(normalizeInboxChannel("facebook")).toBe("FACEBOOK");
    expect(normalizeInboxChannel(null)).toBeNull();
  });

  it("counts conversations for the three customer channels", () => {
    expect(countInboxConversationsByChannel(conversations)).toEqual({
      WHATSAPP: 1,
      INSTAGRAM: 1,
      FACEBOOK: 2,
    });
  });

  it("filters the queue without mixing channels", () => {
    expect(filterInboxConversationsByChannel(conversations, "INSTAGRAM").map((item) => item.id))
      .toEqual(["ig"]);
    expect(filterInboxConversationsByChannel(conversations, "FACEBOOK").map((item) => item.id))
      .toEqual(["fb", "legacy-fb"]);
  });
});
