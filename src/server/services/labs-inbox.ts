import type { AiConversation } from "@prisma/client";
import { readConversationMetadata } from "@/server/services/chatbot/conversation-state";

export type LabsInboxConversation = {
  id: string;
  customerName: string | null;
  customerContact: string | null;
  channelType: string;
  status: string;
  summary: string | null;
  intentLabel: string | null;
  intentScore: number | null;
  intentReason: string | null;
  nextAction: string | null;
  escalatedToHuman: boolean;
  escalationRequestedAt: string | null;
  transcript: Array<{ role: "user" | "assistant"; content: string }>;
  aiPaused: boolean;
};

export function serializeLabsInboxConversations(
  conversations: Pick<
    AiConversation,
    | "id"
    | "customerName"
    | "customerContact"
    | "channelType"
    | "status"
    | "summary"
    | "intentLabel"
    | "intentScore"
    | "intentReason"
    | "nextAction"
    | "escalatedToHuman"
    | "escalationRequestedAt"
    | "metadata"
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
      summary: conversation.summary,
      intentLabel: conversation.intentLabel,
      intentScore: conversation.intentScore,
      intentReason: conversation.intentReason,
      nextAction: conversation.nextAction,
      escalatedToHuman: conversation.escalatedToHuman,
      escalationRequestedAt: conversation.escalationRequestedAt?.toISOString() ?? null,
      transcript: metadata.transcript,
      aiPaused: Boolean(metadata.context?.aiPaused),
    };
  });
}
