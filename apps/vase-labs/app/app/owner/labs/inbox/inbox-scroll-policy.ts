export function isInboxNearBottom(
  metrics: { scrollHeight: number; scrollTop: number; clientHeight: number },
  threshold = 80,
) {
  return metrics.scrollHeight - metrics.scrollTop - metrics.clientHeight <= threshold;
}

export function shouldAutoScrollInbox(input: {
  conversationChanged: boolean;
  operatorSent: boolean;
  messagesAdded: boolean;
  wasNearBottom: boolean;
}) {
  return input.conversationChanged
    || input.operatorSent
    || (input.messagesAdded && input.wasNearBottom);
}
