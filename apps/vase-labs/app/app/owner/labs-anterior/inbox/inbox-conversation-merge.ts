type ConversationWithThread = {
  id: string;
  status: string;
  messages: unknown[];
  handoffs: unknown[];
};

type MessageWithDelivery = {
  id: string;
  delivery?: { status?: string } | null;
};

export function reconcileInboxMessages<T extends MessageWithDelivery>(current: T[], refreshed: T[]): T[] {
  const currentById = new Map(current.map((message) => [message.id, message]));
  return refreshed.map((message) => {
    const loaded = currentById.get(message.id);
    if (!loaded) return message;
    const staleDelivery = !message.delivery && loaded.delivery;
    return staleDelivery ? { ...message, delivery: loaded.delivery } : message;
  });
}

export function mergeInboxConversationSummaries<T extends ConversationWithThread>(
  current: T[],
  refreshed: T[],
): T[] {
  const currentById = new Map(current.map((conversation) => [conversation.id, conversation]));
  const merged = refreshed.map((summary) => {
    const loaded = currentById.get(summary.id);
    if (!loaded) return summary;
    return {
      ...summary,
      messages: summary.messages.length > 0 ? summary.messages : loaded.messages,
      handoffs: summary.handoffs.length > 0 ? summary.handoffs : loaded.handoffs,
    };
  });

  // A short-lived list refresh must never erase a conversation already loaded in
  // the workstation. Closed conversations are the only ones allowed to leave.
  const refreshedIds = new Set(refreshed.map((conversation) => conversation.id));
  return [
    ...merged,
    ...current.filter((conversation) =>
      !refreshedIds.has(conversation.id) && conversation.status !== "CLOSED",
    ),
  ];
}
