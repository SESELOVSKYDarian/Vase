export interface HandoffRecord {
  id: string;
  conversationId: string;
  reason: string;
  target: string;
  status: string;
  assignedTo?: string | null;
  notes?: string | null;
  priority: string;
  createdAt: Date;
  resolvedAt: Date | null;
}

export interface HandoffRepository {
  createHandoff(input: { conversationId: string; reason: string; target: string; priority: string }): Promise<HandoffRecord>;
  updateHandoff(id: string, data: Partial<Pick<HandoffRecord, "status" | "assignedTo" | "notes" | "resolvedAt">>): Promise<HandoffRecord>;
  markConversationEscalated(conversationId: string, escalated: boolean): Promise<void>;
}

export function createHandoffService(repository: HandoffRepository) {
  return {
    async requestHandoff(input: { conversationId: string; reason: string; priority?: string }) {
      const handoff = await repository.createHandoff({
        conversationId: input.conversationId,
        reason: input.reason,
        target: "workplace",
        priority: input.priority ?? "normal",
      });
      await repository.markConversationEscalated(input.conversationId, true);
      return handoff;
    },
    async assignHandoff(handoffId: string, assignedTo: string) {
      return repository.updateHandoff(handoffId, { status: "ASSIGNED", assignedTo });
    },
    async resolveHandoff(handoffId: string, assignedTo: string) {
      return repository.updateHandoff(handoffId, { status: "RESOLVED", assignedTo, resolvedAt: new Date() });
    },
  };
}
