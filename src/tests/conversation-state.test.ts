import { describe, expect, it, vi } from "vitest";
import { persistHumanMessageAndPause } from "@/server/services/chatbot/conversation-state";
import { updateConversationState } from "@/server/queries/chatbot";

vi.mock("@/server/queries/chatbot", () => ({
  updateConversationState: vi.fn().mockResolvedValue({}),
}));

describe("conversation state", () => {
  it("persists a human reply and pauses AI without losing transcript", async () => {
    await persistHumanMessageAndPause({
      conversationId: "conversation-1",
      metadata: {
        state: "IDLE",
        context: { source: "whatsapp" },
        transcript: [{ role: "user", content: "hola" }],
        processedInboundIds: [],
      },
      humanMessage: "te respondo como humano",
    });

    expect(updateConversationState).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "conversation-1",
        incrementMessageCount: true,
        outbound: true,
        metadata: expect.objectContaining({
          context: {
            source: "whatsapp",
            aiPaused: true,
          },
          transcript: [
            { role: "user", content: "hola" },
            { role: "assistant", content: "[HUMANO] te respondo como humano" },
          ],
        }),
      }),
    );
  });
});
