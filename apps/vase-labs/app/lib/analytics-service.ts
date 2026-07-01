import type { LabsAnalyticsSummary, LabsChannel } from "@vase/contracts";

export function summarizeLabsAnalytics(input: {
  conversations: Array<{ status: string; escalatedToHuman: boolean }>;
  messages: Array<{ direction: "INBOUND" | "OUTBOUND" | null; channel?: LabsChannel | null }>;
  tokenUsages: Array<{ totalTokens: number; costCents?: number | null }>;
  channels: Array<{ type: LabsChannel; status: string }>;
  handoffs: Array<{ status: string }>;
}): LabsAnalyticsSummary {
  return {
    conversationsOpen: input.conversations.filter((conversation) => conversation.status === "OPEN").length,
    conversationsEscalated: input.conversations.filter((conversation) => conversation.status === "ESCALATED" || conversation.escalatedToHuman).length,
    inboundMessages: input.messages.filter((message) => message.direction === "INBOUND").length,
    outboundMessages: input.messages.filter((message) => message.direction === "OUTBOUND").length,
    tokensUsed: input.tokenUsages.reduce((total, usage) => total + usage.totalTokens, 0),
    costCents: input.tokenUsages.reduce((total, usage) => total + (usage.costCents ?? 0), 0),
    connectedChannels: input.channels.filter((channel) => channel.status === "CONNECTED").length,
    pendingHandoffs: input.handoffs.filter((handoff) => handoff.status === "PENDING").length,
  };
}
