import { beforeEach, describe, expect, it, vi } from "vitest";
import { routeInboundMessage } from "@/server/services/chatbot/message-router";
import {
  buildTenantKnowledgeContext,
  classifyConversationIntent,
  generateAssistantReply,
  summarizeConversation,
} from "@/server/services/ai";
import type { TenantAiRuntimeConfig } from "@/server/services/ai/models";
import { processQueuedKnowledgeItems } from "@/server/services/ai/knowledge-processing";

vi.mock("@/server/services/ai", () => ({
  buildTenantKnowledgeContext: vi.fn().mockResolvedValue({ items: [], text: "" }),
  classifyConversationIntent: vi.fn().mockResolvedValue({
    label: "GENERAL",
    score: 70,
    reason: "Consulta general",
    nextAction: "RESPOND",
    shouldEscalate: false,
  }),
  generateAssistantReply: vi.fn().mockResolvedValue("Respuesta desde conocimiento."),
  summarizeConversation: vi.fn().mockResolvedValue("Resumen"),
}));

vi.mock("@/server/services/ai/knowledge-processing", () => ({
  processQueuedKnowledgeItems: vi.fn().mockResolvedValue({ processed: 1 }),
}));

vi.mock("@/server/services/chatbot/escalation", () => ({
  escalateConversation: vi.fn(),
  shouldEscalateToHuman: vi.fn().mockReturnValue(false),
}));

vi.mock("@/server/queries/chatbot", () => ({
  updateConversationInsights: vi.fn().mockResolvedValue(undefined),
}));

const mockedBuildTenantKnowledgeContext = vi.mocked(buildTenantKnowledgeContext);
const mockedClassifyConversationIntent = vi.mocked(classifyConversationIntent);
const mockedGenerateAssistantReply = vi.mocked(generateAssistantReply);
const mockedProcessQueuedKnowledgeItems = vi.mocked(processQueuedKnowledgeItems);

const aiConfig: TenantAiRuntimeConfig = {
  tenantId: "tenant-1",
  workspaceId: "workspace-1",
  displayName: "Vase Labs",
  tone: "PREMIUM",
  model: "",
  temperature: 0.4,
  timezone: "America/Argentina/Buenos_Aires",
  bookingEnabled: false,
  businessContext: {},
  systemPrompt: null,
  escalation: {
    enabled: false,
    destination: "HUMAN_QUEUE",
  },
};

describe("chatbot message router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedClassifyConversationIntent.mockResolvedValue({
      label: "GENERAL",
      score: 70,
      reason: "Consulta general",
      nextAction: "RESPOND",
      shouldEscalate: false,
    });
    mockedBuildTenantKnowledgeContext.mockResolvedValue({
      items: [],
      text: "Archivo: vase-labs-servicios.md\nVase Labs desarrolla ecommerce personalizado.",
    });
  });

  it("processes queued knowledge before building the reply context", async () => {
    await routeInboundMessage({
      tenantConfig: {
        tenantId: "tenant-1",
        workspaceId: "workspace-1",
        channelId: "channel-1",
        channelConfig: {},
        displayName: "Vase Labs",
        channelType: "WHATSAPP",
        bookingEnabled: false,
        bookingConfiguration: {},
        businessContext: {},
        escalation: {
          enabled: false,
          destination: "HUMAN_QUEUE",
        },
      },
      aiConfig,
      conversation: {
        id: "conversation-1",
        metadata: { transcript: [] },
        customerName: "Alexis",
        customerContact: "5492230000000",
      },
      text: "hola",
    });

    expect(mockedProcessQueuedKnowledgeItems).toHaveBeenCalledWith("tenant-1", "workspace-1");
    expect(mockedProcessQueuedKnowledgeItems.mock.invocationCallOrder[0]).toBeLessThan(
      mockedBuildTenantKnowledgeContext.mock.invocationCallOrder[0],
    );
    expect(mockedGenerateAssistantReply).toHaveBeenCalledWith(
      expect.objectContaining({
        knowledgeText: "Archivo: vase-labs-servicios.md\nVase Labs desarrolla ecommerce personalizado.",
      }),
    );
    expect(summarizeConversation).toHaveBeenCalled();
  });
});
