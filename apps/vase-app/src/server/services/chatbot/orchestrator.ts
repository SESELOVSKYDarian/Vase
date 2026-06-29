import type { AiChannelType } from "@prisma/client";
import { downloadWhatsAppMedia } from "@/lib/integrations";
import { readWhatsAppProviderConfig } from "@/lib/integrations/whatsapp-provider";
import type { InboundChannelMessage } from "@/lib/integrations/channel-types";
import { dispatchChannelReply } from "@/server/services/chatbot/channel-dispatch";
import {
  getOrCreateConversation,
  hasProcessedInboundMessage,
  isAiPaused,
  persistInboundMessage,
  persistOutboundMessage,
} from "@/server/services/chatbot/conversation-state";
import { routeInboundMessage } from "@/server/services/chatbot/message-router";
import { getTenantChatbotConfig } from "@/server/services/chatbot/tenant-chatbot-config";
import { getTenantAiRuntimeConfig, transcribeAudio } from "@/server/services/ai";

function normalizeInboundText(message: InboundChannelMessage) {
  return String(message.text || "").trim();
}

export async function handleInboundChannelMessage(message: InboundChannelMessage) {
  const tenantConfig = await getTenantChatbotConfig(
    message.tenantId,
    message.channelType,
  );
  const aiConfig = await getTenantAiRuntimeConfig(message.tenantId);

  const conversation = await getOrCreateConversation({
    tenantId: tenantConfig.tenantId,
    workspaceId: tenantConfig.workspaceId,
    channelType: message.channelType as AiChannelType,
    externalThreadKey: message.externalThreadKey,
    customerName: message.customerName,
    customerContact: message.customerContact,
  });

  let text = normalizeInboundText(message);

  if (message.messageType === "audio" && message.mediaId) {
    if (message.channelType === "WHATSAPP") {
      const providerConfig = readWhatsAppProviderConfig(tenantConfig.channelConfig);
      const accessToken = String(providerConfig.accessToken || "");
      if (!accessToken) {
        throw new Error("WhatsApp access token missing for audio transcription");
      }
      const mediaBuffer = await downloadWhatsAppMedia(message.mediaId, accessToken);
      text = await transcribeAudio(mediaBuffer, aiConfig);
    }
  }

  if (!text) {
    return { ignored: true };
  }

  if (hasProcessedInboundMessage(conversation.metadata, message.externalMessageId)) {
    return { conversationId: conversation.id, duplicate: true };
  }

  const updatedConversation = await persistInboundMessage({
    conversationId: conversation.id,
    metadata: conversation.metadata,
    userMessage: text,
    externalMessageId: message.externalMessageId,
  });
  const conversationMetadata = updatedConversation?.metadata ?? conversation.metadata;

  if (isAiPaused(conversationMetadata)) {
    return { conversationId: conversation.id, paused: true };
  }

  const decision = await routeInboundMessage({
    tenantConfig,
    aiConfig,
    conversation: {
      id: conversation.id,
      metadata: conversationMetadata,
      customerName: conversation.customerName,
      customerContact: conversation.customerContact,
    },
    text,
  });

  await persistOutboundMessage({
    conversationId: conversation.id,
    metadata: conversationMetadata,
    assistantMessage: decision.reply,
    state: decision.state,
    context: decision.context,
    summary: decision.summary,
    escalatedToHuman: decision.escalatedToHuman,
  });

  let delivered = false;
  let deliveryError: string | undefined;

  if (message.customerContact) {
    try {
      await dispatchChannelReply({
        channelType: message.channelType,
        channelId: tenantConfig.channelId,
        channelConfig: tenantConfig.channelConfig,
        customerContact: message.customerContact,
        text: decision.reply,
      });
      delivered = true;
    } catch (error) {
      deliveryError = error instanceof Error ? error.message : "Channel delivery failed";
      console.error(deliveryError);
    }
  }

  return {
    conversationId: conversation.id,
    reply: decision.reply,
    state: decision.state,
    escalatedToHuman: decision.escalatedToHuman,
    delivered,
    deliveryError,
  };
}
