import type { AiConversation } from "@prisma/client";

const INTENT_LABELS = ["HOT_LEAD", "RESEARCHING", "LOW_INTENT", "HUMAN_REQUESTED", "UNCLASSIFIED"] as const;

export type LabsConversationAnalytics = {
  total: number;
  classified: number;
  hotLeads: number;
  escalated: number;
  averageIntentScore: number;
  byIntent: Array<{ label: string; count: number }>;
  byChannel: Array<{ channel: string; count: number }>;
  trend: Array<{ date: string; conversations: number; escalated: number }>;
  funnel: Array<{ stage: string; value: number }>;
};

type ConversationForAnalytics = Pick<
  AiConversation,
  "channelType" | "intentLabel" | "intentScore" | "escalatedToHuman" | "lastMessageAt"
>;

function formatDay(value: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(value);
}

export function buildLabsConversationAnalytics(conversations: ConversationForAnalytics[]): LabsConversationAnalytics {
  const total = conversations.length;
  const classifiedConversations = conversations.filter((conversation) => Boolean(conversation.intentLabel));
  const hotLeads = conversations.filter((conversation) => conversation.intentLabel === "HOT_LEAD").length;
  const escalated = conversations.filter((conversation) => conversation.escalatedToHuman).length;
  const scored = conversations.filter((conversation) => typeof conversation.intentScore === "number");
  const averageIntentScore = scored.length
    ? Math.round(scored.reduce((sum, conversation) => sum + (conversation.intentScore ?? 0), 0) / scored.length)
    : 0;

  const intentCounts = new Map<string, number>(INTENT_LABELS.map((label) => [label, 0]));
  const channelCounts = new Map<string, number>();
  const trendCounts = new Map<string, { date: string; conversations: number; escalated: number; sortKey: number }>();

  for (const conversation of conversations) {
    const label = conversation.intentLabel ?? "UNCLASSIFIED";
    intentCounts.set(label, (intentCounts.get(label) ?? 0) + 1);
    channelCounts.set(conversation.channelType, (channelCounts.get(conversation.channelType) ?? 0) + 1);

    const day = formatDay(conversation.lastMessageAt);
    const dayKey = conversation.lastMessageAt.toISOString().slice(0, 10);
    const current = trendCounts.get(dayKey) ?? {
      date: day,
      conversations: 0,
      escalated: 0,
      sortKey: conversation.lastMessageAt.getTime(),
    };
    current.conversations += 1;
    current.escalated += conversation.escalatedToHuman ? 1 : 0;
    trendCounts.set(dayKey, current);
  }

  return {
    total,
    classified: classifiedConversations.length,
    hotLeads,
    escalated,
    averageIntentScore,
    byIntent: Array.from(intentCounts.entries()).map(([label, count]) => ({ label, count })),
    byChannel: Array.from(channelCounts.entries())
      .map(([channel, count]) => ({ channel, count }))
      .sort((a, b) => b.count - a.count),
    trend: Array.from(trendCounts.values())
      .sort((a, b) => a.sortKey - b.sortKey)
      .slice(-14)
      .map((item) => ({
        date: item.date,
        conversations: item.conversations,
        escalated: item.escalated,
      })),
    funnel: [
      { stage: "Total", value: total },
      { stage: "Clasificadas", value: classifiedConversations.length },
      { stage: "Hot leads", value: hotLeads },
      { stage: "Derivadas", value: escalated },
    ],
  };
}
