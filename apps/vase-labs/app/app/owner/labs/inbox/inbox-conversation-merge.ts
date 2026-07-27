type ConversationWithThread = {
  id: string;
  messages: unknown[];
  handoffs: unknown[];
};

export function mergeInboxConversationSummaries<T extends ConversationWithThread>(
  current: T[],
  refreshed: T[],
): T[] {
  const currentById = new Map(current.map((conversation) => [conversation.id, conversation]));
  return refreshed.map((summary) => {
    const loaded = currentById.get(summary.id);
    if (!loaded) return summary;
    return {
      ...summary,
      messages: summary.messages.length > 0 ? summary.messages : loaded.messages,
      handoffs: summary.handoffs.length > 0 ? summary.handoffs : loaded.handoffs,
    };
  });
}
