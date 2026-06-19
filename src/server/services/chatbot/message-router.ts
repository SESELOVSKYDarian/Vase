import { buildTenantKnowledgeContext, generateAssistantReply, summarizeConversation, type TenantAiRuntimeConfig } from "@/server/services/ai";
import { classifyConversationIntent } from "@/server/services/ai";
import { processQueuedKnowledgeItems } from "@/server/services/ai/knowledge-processing";
import { resolveBookingReply } from "@/server/services/chatbot/booking-flow";
import { readConversationMetadata } from "@/server/services/chatbot/conversation-state";
import { escalateConversation, shouldEscalateToHuman } from "@/server/services/chatbot/escalation";
import { updateConversationInsights } from "@/server/queries/chatbot";
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
  const classification = await classifyConversationIntent({
    config: input.aiConfig,
    metadata: input.conversation.metadata,
    currentMessage: input.text,
  });
  const humanRequested = shouldEscalateToHuman(input.text, input.tenantConfig) || classification.shouldEscalate;

  if (humanRequested) {
    const escalation = await escalateConversation({
      tenantId: input.tenantConfig.tenantId,
      workspaceId: input.tenantConfig.workspaceId,
      conversationId: input.conversation.id,
      customerName: input.conversation.customerName,
      customerContact: input.conversation.customerContact,
      text: input.text,
    });
    const summary = await summarizeConversation({
      config: input.aiConfig,
      transcript: [
        ...(metadata.transcript || []).map((entry) => `${entry.role}: ${entry.content}`),
        `assistant: ${escalation.reply}`,
      ].join("\n"),
    });

    await updateConversationInsights({
      conversationId: input.conversation.id,
      summary,
      intentLabel: "HUMAN_REQUESTED",
      intentScore: 100,
      intentReason: classification.reason,
      nextAction: classification.nextAction,
      classifiedAt: new Date(),
      escalatedToHuman: true,
    });

    return {
      reply: escalation.reply,
      state: "ESCALATED",
      context: metadata.context || {},
      escalatedToHuman: true,
      summary,
    };
  }

  const booking = resolveBookingReply({
    text: input.text,
    config: input.tenantConfig,
    metadata,
  });

  if (booking.handled) {
    const summary = await summarizeConversation({
      config: input.aiConfig,
      transcript: [
        ...(metadata.transcript || []).map((entry) => `${entry.role}: ${entry.content}`),
        `assistant: ${booking.reply}`,
      ].join("\n"),
    });

    await updateConversationInsights({
      conversationId: input.conversation.id,
      summary,
      intentLabel: classification.label,
      intentScore: classification.score,
      intentReason: classification.reason,
      nextAction: classification.nextAction,
      classifiedAt: new Date(),
      escalatedToHuman: false,
    });

    return {
      reply: booking.reply,
      state: booking.state,
      context: booking.context,
      escalatedToHuman: false,
      summary,
    };
  }

  await processQueuedKnowledgeItems(
    input.tenantConfig.tenantId,
    input.tenantConfig.workspaceId,
  );

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
    transcript: [
      ...(metadata.transcript || []).map((entry) => `${entry.role}: ${entry.content}`),
      `assistant: ${reply}`,
    ].join("\n"),
  });

  await updateConversationInsights({
    conversationId: input.conversation.id,
    summary,
    intentLabel: classification.label,
    intentScore: classification.score,
    intentReason: classification.reason,
    nextAction: classification.nextAction,
    classifiedAt: new Date(),
    escalatedToHuman: false,
  });

  return {
    reply,
    state: metadata.state || "IDLE",
    context: metadata.context || {},
    escalatedToHuman: false,
    summary,
  };
}
