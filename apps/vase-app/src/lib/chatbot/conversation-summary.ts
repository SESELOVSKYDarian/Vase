const MAX_CONVERSATION_SUMMARY_LENGTH = 180;

export function clampConversationSummary(summary?: string | null) {
  const normalized = summary?.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return undefined;
  }

  if (normalized.length <= MAX_CONVERSATION_SUMMARY_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_CONVERSATION_SUMMARY_LENGTH - 3).trimEnd()}...`;
}
