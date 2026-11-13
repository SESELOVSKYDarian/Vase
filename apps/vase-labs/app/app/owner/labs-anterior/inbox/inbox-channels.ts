export const inboxChannels = ["WHATSAPP", "INSTAGRAM", "FACEBOOK"] as const;

export type InboxChannel = typeof inboxChannels[number];

type ChannelConversation = {
  channel: string | null;
};

export function normalizeInboxChannel(channel: string | null | undefined): InboxChannel | null {
  const normalized = channel?.trim().toUpperCase();
  if (normalized === "MESSENGER") return "FACEBOOK";
  return inboxChannels.includes(normalized as InboxChannel)
    ? normalized as InboxChannel
    : null;
}

export function filterInboxConversationsByChannel<T extends ChannelConversation>(
  conversations: T[],
  channel: InboxChannel,
) {
  return conversations.filter(
    (conversation) => normalizeInboxChannel(conversation.channel) === channel,
  );
}

export function countInboxConversationsByChannel<T extends ChannelConversation>(
  conversations: T[],
): Record<InboxChannel, number> {
  return inboxChannels.reduce<Record<InboxChannel, number>>(
    (counts, channel) => {
      counts[channel] = filterInboxConversationsByChannel(conversations, channel).length;
      return counts;
    },
    { WHATSAPP: 0, INSTAGRAM: 0, FACEBOOK: 0 },
  );
}
