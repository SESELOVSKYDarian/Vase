import type { InboxConversation, InboxMessage, LabsChannel } from "@vase/contracts";

export interface InboxConversationRecord {
  id: string;
  globalTenantId: string;
  channel: LabsChannel | null;
  status: "OPEN" | "ESCALATED" | "CLOSED";
  customerName: string | null;
  customerContact?: string | null;
  lastMessageAt: Date | null;
  messageCount: number;
  escalatedToHuman: boolean;
}

export interface InboxRepository {
  listConversations(input: { globalTenantId: string; channel?: LabsChannel; status?: string }): Promise<InboxConversationRecord[]>;
  getConversation(input: { globalTenantId: string; conversationId: string }): Promise<InboxConversationRecord | null>;
  listMessages(input: { conversationId: string }): Promise<Array<Omit<InboxMessage, "createdAt"> & { createdAt: Date }>>;
}

function toInboxConversation(record: InboxConversationRecord): InboxConversation {
  return {
    ...record,
    lastMessageAt: record.lastMessageAt?.toISOString() ?? null,
    customerContact: record.customerContact ?? null,
  };
}

export function createInboxService(repository: InboxRepository) {
  return {
    async listConversations(input: { globalTenantId: string; channel?: LabsChannel; status?: string }) {
      return (await repository.listConversations(input)).map(toInboxConversation);
    },
    async getConversation(input: { globalTenantId: string; conversationId: string }) {
      const conversation = await repository.getConversation(input);
      if (!conversation) return null;
      const messages = await repository.listMessages({ conversationId: conversation.id });
      return {
        conversation: toInboxConversation(conversation),
        messages: messages.map((message) => ({
          ...message,
          createdAt: message.createdAt.toISOString(),
        })),
      };
    },
  };
}
