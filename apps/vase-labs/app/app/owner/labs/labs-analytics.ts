export type LabsConversationAnalytics = {
  total: number;
  classified: number;
  hotLeads: number;
  escalated: number;
  byIntent: Array<{ label: string; count: number }>;
  byChannel: Array<{ channel: string; count: number }>;
  trend: Array<{ date: string; conversations: number; escalated: number }>;
};

export function buildLabsConversationAnalytics(
  conversations: Array<{
    channel: string | null;
    intentLabel: string | null;
    escalatedToHuman: boolean;
    lastMessageAt: Date | null;
  }>,
): LabsConversationAnalytics {
  const INTENT_LABELS = ["HOT_LEAD", "RESEARCHING", "LOW_INTENT", "HUMAN_REQUESTED", "UNCLASSIFIED"] as const;

  const total = conversations.length;
  const classified = conversations.filter((c) => Boolean(c.intentLabel)).length;
  const hotLeads = conversations.filter((c) => c.intentLabel === "HOT_LEAD").length;
  const escalated = conversations.filter((c) => c.escalatedToHuman).length;

  const intentCounts = new Map<string, number>(INTENT_LABELS.map((label) => [label, 0]));
  const channelCounts = new Map<string, number>();
  const trendCounts = new Map<
    string,
    { date: string; conversations: number; escalated: number; sortKey: number }
  >();

  const formatDay = (value: Date) =>
    new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short" }).format(value);

  for (const c of conversations) {
    const label = c.intentLabel ?? "UNCLASSIFIED";
    intentCounts.set(label, (intentCounts.get(label) ?? 0) + 1);

    const ch = c.channel ?? "LABS";
    channelCounts.set(ch, (channelCounts.get(ch) ?? 0) + 1);

    if (c.lastMessageAt) {
      const dayKey = c.lastMessageAt.toISOString().slice(0, 10);
      const current = trendCounts.get(dayKey) ?? {
        date: formatDay(c.lastMessageAt),
        conversations: 0,
        escalated: 0,
        sortKey: c.lastMessageAt.getTime(),
      };
      current.conversations += 1;
      current.escalated += c.escalatedToHuman ? 1 : 0;
      trendCounts.set(dayKey, current);
    }
  }

  return {
    total,
    classified,
    hotLeads,
    escalated,
    byIntent: Array.from(intentCounts.entries()).map(([label, count]) => ({ label, count })),
    byChannel: Array.from(channelCounts.entries())
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count),
    trend: Array.from(trendCounts.values())
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(-14)
      .map(({ date, conversations, escalated }) => ({ date, conversations, escalated })),
  };
}
