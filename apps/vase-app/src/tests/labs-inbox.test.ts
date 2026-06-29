import { describe, expect, it } from "vitest";
import { serializeLabsInboxConversations } from "@/server/services/labs-inbox";

describe("labs inbox serialization", () => {
  it("serializes transcript and AI pause state for live inbox clients", () => {
    const conversations = serializeLabsInboxConversations([
      {
        id: "conversation-1",
        customerName: "Darian",
        customerContact: "5492230000000",
        channelType: "WHATSAPP",
        status: "OPEN",
        summary: "Consulta atendida",
        intentLabel: "GENERAL",
        intentScore: 70,
        intentReason: "Consulta general",
        nextAction: "RESPOND",
        escalatedToHuman: false,
        escalationRequestedAt: null,
        metadata: {
          transcript: [
            { role: "user", content: "hola" },
            { role: "assistant", content: "[HUMANO] hola, te ayudo" },
          ],
          context: { aiPaused: true },
        },
      } as never,
    ]);

    expect(conversations).toEqual([
      {
        id: "conversation-1",
        customerName: "Darian",
        customerContact: "5492230000000",
        channelType: "WHATSAPP",
        status: "OPEN",
        summary: "Consulta atendida",
        intentLabel: "GENERAL",
        intentScore: 70,
        intentReason: "Consulta general",
        nextAction: "RESPOND",
        escalatedToHuman: false,
        escalationRequestedAt: null,
        transcript: [
          { role: "user", content: "hola" },
          { role: "assistant", content: "[HUMANO] hola, te ayudo" },
        ],
        aiPaused: true,
      },
    ]);
  });
});
