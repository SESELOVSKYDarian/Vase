import { buildTenantKnowledgeContext, generateAssistantReply, summarizeConversation, type TenantAiRuntimeConfig } from "@/server/services/ai";
import { resolveBookingReply } from "@/server/services/chatbot/booking-flow";
import { readConversationMetadata } from "@/server/services/chatbot/conversation-state";
import { escalateConversation, shouldEscalateToHuman } from "@/server/services/chatbot/escalation";
import type { TenantChatbotConfig } from "@/server/services/chatbot/tenant-chatbot-config";

export async function routeInboundMessage(input: {
  tenantConfig: TenantChatbotConfig;
  aiConfig: TenantAiRuntimeConfig;
  conversation: {
    id: string;
    metadata: unknown;
    customerName?: string | null;
    customerContact?: string | null;
  };
  text: string;
}) {
  const metadata = readConversationMetadata(input.conversation.metadata);

  if (shouldEscalateToHuman(input.text, input.tenantConfig)) {
    const escalation = await escalateConversation({
      tenantId: input.tenantConfig.tenantId,
      workspaceId: input.tenantConfig.workspaceId,
      conversationId: input.conversation.id,
      customerName: input.conversation.customerName,
      customerContact: input.conversation.customerContact,
      text: input.text,
    });

    return {
      reply: escalation.reply,
      state: "ESCALATED",
      context: metadata.context || {},
      escalatedToHuman: true,
      summary: input.text,
    };
  }

  const booking = resolveBookingReply({
    text: input.text,
    config: input.tenantConfig,
    metadata,
  });

  if (booking.handled) {
    return {
      reply: booking.reply,
      state: booking.state,
      context: booking.context,
      escalatedToHuman: false,
      summary: null,
    };
  }

  const knowledge = await buildTenantKnowledgeContext(
    input.tenantConfig.tenantId,
    input.tenantConfig.workspaceId,
  );

  const reply = await generateAssistantReply({
    config: input.aiConfig,
    knowledgeText: knowledge.text,
    userMessage: input.text,
    history: metadata.transcript?.slice(-8) || [],
  });

  const summary = await summarizeConversation({
    config: input.aiConfig,
    transcript: [...(metadata.transcript || []).map((entry) => `${entry.role}: ${entry.content}`), `user: ${input.text}`, `assistant: ${reply}`].join("\n"),
  });

  return {
    reply,
    state: metadata.state || "IDLE",
    context: metadata.context || {},
    escalatedToHuman: false,
    summary,
  };
}
