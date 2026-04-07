import { prisma } from "@/lib/db/prisma";
import { getLabsPlanLimits } from "@/lib/labs/plans";

export async function getLabsOwnerDashboard(tenantId: string) {
  const [workspace, knowledgeItems, channels, conversations, trainingJobs, featureFlags] =
    await Promise.all([
      prisma.tenantAiWorkspace.findUnique({
        where: { tenantId },
      }),
      prisma.aiKnowledgeItem.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.aiChannelConnection.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.aiConversation.findMany({
        where: { tenantId },
        orderBy: { lastMessageAt: "desc" },
        take: 10,
      }),
      prisma.aiTrainingJob.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.featureFlag.findMany({
        where: { tenantId },
        orderBy: { key: "asc" },
      }),
    ]);

  if (!workspace) {
    return null;
  }

  const limits = getLabsPlanLimits(workspace.plan);
  const files = knowledgeItems.filter((item) => item.type === "FILE");
  const faqs = knowledgeItems.filter((item) => item.type === "FAQ");
  const urls = knowledgeItems.filter((item) => item.type === "URL");
  const connectedChannels = channels.filter((channel) => channel.status === "CONNECTED");
  const escalatedConversations = conversations.filter((conversation) => conversation.escalatedToHuman);
  const openConversations = conversations.filter((conversation) => conversation.status === "OPEN");

  const setupSteps = {
    hasKnowledge: knowledgeItems.length > 0,
    hasFiles: files.length > 0,
    hasFaqs: faqs.length > 0,
    hasUrls: urls.length > 0,
    hasChannel: connectedChannels.length > 0,
    hasEscalation: workspace.humanEscalationEnabled,
  };

  return {
    workspace,
    knowledgeItems,
    files,
    faqs,
    urls,
    channels,
    connectedChannels,
    conversations,
    trainingJobs,
    featureFlags,
    limits,
    summary: {
      knowledgeItems: knowledgeItems.length,
      connectedChannels: connectedChannels.length,
      openConversations: openConversations.length,
      escalatedConversations: escalatedConversations.length,
      monthlyConversationLimit: workspace.monthlyConversationLimit,
    },
    setupSteps,
  };
}
