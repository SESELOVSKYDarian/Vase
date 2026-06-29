import { describe, expect, it } from "vitest";
import { clampConversationSummary } from "@/lib/chatbot/conversation-summary";

describe("conversation summary helpers", () => {
  it("keeps summaries within the database-safe length", () => {
    const summary = clampConversationSummary("x".repeat(500));

    expect(summary).toHaveLength(180);
    expect(summary?.endsWith("...")).toBe(true);
  });

  it("normalizes whitespace before truncating", () => {
    expect(clampConversationSummary("  hola\n\n mundo   ")).toBe("hola mundo");
  });

  it("returns undefined for empty summaries", () => {
    expect(clampConversationSummary("   ")).toBeUndefined();
    expect(clampConversationSummary(null)).toBeUndefined();
  });
});
