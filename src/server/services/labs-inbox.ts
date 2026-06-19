import type { AiConversation } from "@prisma/client";
import { readConversationMetadata } from "@/server/services/chatbot/conversation-state";

export type LabsInboxConversation = {
  id: string;
  customerName: string | null;
  customerContact: string | null;
  channelType: string;
  status: string;
  transcript: Array<{ role: "user" | "assistant"; content: string }>;
  aiPaused: boolean;
};

export function serializeLabsInboxConversations(
  conversations: Pick<
    AiConversation,
    "id" | "customerName" | "customerContact" | "channelType" | "status" | "metadata"
  >[],
): LabsInboxConversation[] {
  return conversations.map((conversation) => {
    const metadata = readConversationMetadata(conversation.metadata);

    return {
      id: conversation.id,
      customerName: conversation.customerName,
      customerContact: conversation.customerContact,
      channelType: conversation.channelType,
      status: conversation.status,
      transcript: metadata.transcript,
      aiPaused: Boolean(metadata.context?.aiPaused),
    };
  });
}
