import type { AiConversation } from "@prisma/client";

export type LabsConversationActivityItem = {
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
  lastMessageAt: string;
  startedAt: string;
  messageCount: number;
};

export function serializeLabsConversationActivity(
  conversations: AiConversation[],
): LabsConversationActivityItem[] {
  return conversations.map((conversation) => ({
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
    lastMessageAt: conversation.lastMessageAt.toISOString(),
    startedAt: conversation.startedAt.toISOString(),
    messageCount: conversation.messageCount,
  }));
}
