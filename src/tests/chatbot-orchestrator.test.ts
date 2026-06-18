import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleInboundChannelMessage } from "@/server/services/chatbot/orchestrator";
import { dispatchChannelReply } from "@/server/services/chatbot/channel-dispatch";
import {
  getOrCreateConversation,
  persistInboundMessage,
  persistOutboundMessage,
} from "@/server/services/chatbot/conversation-state";
import { routeInboundMessage } from "@/server/services/chatbot/message-router";

vi.mock("@/server/services/chatbot/channel-dispatch", () => ({
  dispatchChannelReply: vi.fn(),
}));

vi.mock("@/server/services/chatbot/conversation-state", () => ({
  getOrCreateConversation: vi.fn(),
  hasProcessedInboundMessage: vi.fn((metadata: unknown, externalMessageId?: string | null) => {
    const source = metadata as { processedInboundIds?: string[] };
    return Boolean(externalMessageId && source.processedInboundIds?.includes(externalMessageId));
  }),
  isAiPaused: vi.fn().mockReturnValue(false),
  persistInboundMessage: vi.fn().mockResolvedValue(undefined),
  persistOutboundMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/server/services/chatbot/message-router", () => ({
  routeInboundMessage: vi.fn(),
}));

vi.mock("@/server/services/chatbot/tenant-chatbot-config", () => ({
  getTenantChatbotConfig: vi.fn().mockResolvedValue({
    tenantId: "tenant-1",
    workspaceId: "workspace-1",
    channelId: "channel-1",
    channelConfig: { provider: "META_OFFICIAL", accessToken: "bad-token", phoneNumberId: "phone-1" },
  }),
}));

vi.mock("@/server/services/ai", () => ({
  getTenantAiRuntimeConfig: vi.fn().mockResolvedValue({}),
  transcribeAudio: vi.fn(),
}));

vi.mock("@/lib/integrations", () => ({
  downloadWhatsAppMedia: vi.fn(),
}));

vi.mock("@/lib/integrations/whatsapp-provider", () => ({
  readWhatsAppProviderConfig: vi.fn().mockReturnValue({ provider: "META_OFFICIAL", accessToken: "bad-token" }),
}));

const mockedDispatchChannelReply = vi.mocked(dispatchChannelReply);
const mockedGetOrCreateConversation = vi.mocked(getOrCreateConversation);
const mockedPersistOutboundMessage = vi.mocked(persistOutboundMessage);
const mockedRouteInboundMessage = vi.mocked(routeInboundMessage);

describe("chatbot orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetOrCreateConversation.mockResolvedValue({
      id: "conversation-1",
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      channelType: "WHATSAPP",
      externalThreadKey: "thread-1",
      customerName: "Alexis",
      customerContact: "5492230000000",
      status: "OPEN",
      aiPaused: false,
      assignedToUserId: null,
      metadata: { transcript: [] },
      summary: null,
      lastMessageAt: null,
      messageCount: 0,
      escalatedAt: null,
      closedAt: null,
      createdAt: new Date("2026-06-18T16:36:00.000Z"),
      updatedAt: new Date("2026-06-18T16:36:00.000Z"),
    });
    mockedRouteInboundMessage.mockResolvedValue({
      reply: "Hola, soy el asistente de Vase Labs.",
      state: "IDLE",
      context: {},
      summary: "Saludo inicial",
      escalatedToHuman: false,
    });
  });

  it("persists the AI reply even when WhatsApp delivery fails", async () => {
    mockedDispatchChannelReply.mockRejectedValueOnce(new Error("WhatsApp send failed: Authentication Error"));

    const result = await handleInboundChannelMessage({
      tenantId: "tenant-1",
      channelType: "WHATSAPP",
      externalThreadKey: "thread-1",
      customerName: "Alexis",
      customerContact: "5492230000000",
      text: "hola",
    });

    expect(persistInboundMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "conversation-1",
        metadata: { transcript: [] },
        userMessage: "hola",
      }),
    );
    expect(mockedPersistOutboundMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: "conversation-1",
        assistantMessage: "Hola, soy el asistente de Vase Labs.",
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        conversationId: "conversation-1",
        reply: "Hola, soy el asistente de Vase Labs.",
        delivered: false,
        deliveryError: "WhatsApp send failed: Authentication Error",
      }),
    );
  });

  it("ignores duplicate inbound messages with the same external message id", async () => {
    mockedGetOrCreateConversation.mockResolvedValueOnce({
      id: "conversation-1",
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
      channelType: "WHATSAPP",
      externalThreadKey: "thread-1",
      customerName: "Alexis",
      customerContact: "5492230000000",
      status: "OPEN",
      aiPaused: false,
      assignedToUserId: null,
      metadata: {
        transcript: [{ role: "user", content: "messi" }],
        processedInboundIds: ["wamid.duplicate"],
      },
      summary: null,
      lastMessageAt: null,
      messageCount: 1,
      escalatedAt: null,
      closedAt: null,
      createdAt: new Date("2026-06-18T16:36:00.000Z"),
      updatedAt: new Date("2026-06-18T16:36:00.000Z"),
    });

    const result = await handleInboundChannelMessage({
      tenantId: "tenant-1",
      channelType: "WHATSAPP",
      externalThreadKey: "thread-1",
      customerName: "Alexis",
      customerContact: "5492230000000",
      text: "messi",
      externalMessageId: "wamid.duplicate",
    });

    expect(result).toEqual({ conversationId: "conversation-1", duplicate: true });
    expect(persistInboundMessage).not.toHaveBeenCalled();
    expect(mockedRouteInboundMessage).not.toHaveBeenCalled();
    expect(mockedDispatchChannelReply).not.toHaveBeenCalled();
  });
});
