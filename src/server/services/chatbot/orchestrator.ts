import type { AiChannelType } from "@prisma/client";
import { downloadWhatsAppMedia } from "@/lib/integrations";
import type { InboundChannelMessage } from "@/lib/integrations/channel-types";
import { dispatchChannelReply } from "@/server/services/chatbot/channel-dispatch";
import {
  getOrCreateConversation,
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
      const accessToken = String(tenantConfig.channelConfig.accessToken || "");
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

  await persistInboundMessage({
    conversationId: conversation.id,
    metadata: conversation.metadata,
    userMessage: text,
  });

  const decision = await routeInboundMessage({
    tenantConfig,
    aiConfig,
    conversation: {
      id: conversation.id,
      metadata: conversation.metadata,
      customerName: conversation.customerName,
      customerContact: conversation.customerContact,
    },
    text,
  });

  if (message.customerContact) {
    await dispatchChannelReply({
      channelType: message.channelType,
      channelConfig: tenantConfig.channelConfig,
      customerContact: message.customerContact,
      text: decision.reply,
    });
  }

  await persistOutboundMessage({
    conversationId: conversation.id,
    metadata: conversation.metadata,
    assistantMessage: decision.reply,
    state: decision.state,
    context: decision.context,
    summary: decision.summary,
    escalatedToHuman: decision.escalatedToHuman,
  });

  return {
    conversationId: conversation.id,
    reply: decision.reply,
    state: decision.state,
    escalatedToHuman: decision.escalatedToHuman,
  };
}
