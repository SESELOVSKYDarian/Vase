import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { InboxWorkstation, type InboxConversationItem, type InboxInsight } from "./inbox-workstation";

export const dynamic = "force-dynamic";

async function getInboxData() {
  const requestHeaders = await headers();

  try {
    const resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
    const [conversations, channels] = await Promise.all([
      labsPrisma.conversation.findMany({
        where: {
          assistantId: resolved.assistant.id,
          status: { in: ["OPEN", "ESCALATED"] },
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 80,
            include: {
              deliveries: {
                orderBy: { updatedAt: "desc" },
                take: 1,
              },
            },
          },
          handoffs: {
            where: { status: { in: ["PENDING", "ASSIGNED"] } },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          insight: {
            select: { leadScore: true, intentLabel: true, currentNeed: true, productInterests: true, recommendations: true, nextBestAction: true },
          },
        },
        orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
        take: 50,
      }),
      labsPrisma.channel.findMany({
        where: {
          assistantId: resolved.assistant.id,
          type: { in: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"] },
        },
        select: {
          type: true,
          status: true,
          lastSyncedAt: true,
          lastError: true,
        },
      }),
    ]);

    const strings = (value: unknown) => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : []);
    const insights: Record<string, InboxInsight> = {};
    for (const conversation of conversations) {
      if (!conversation.insight) continue;
      insights[conversation.id] = {
        leadScore: conversation.insight.leadScore,
        intentLabel: conversation.insight.intentLabel,
        currentNeed: conversation.insight.currentNeed,
        productInterests: strings(conversation.insight.productInterests),
        recommendations: strings(conversation.insight.recommendations),
        nextBestAction: conversation.insight.nextBestAction,
      };
    }

    return {
      tenantSlug: resolved.context.tenantSlug,
      insights,
      channelStates: channels.map((channel) => ({
        channel: channel.type,
        status: channel.status,
        lastSyncedAt: channel.lastSyncedAt?.toISOString() ?? null,
        lastError: channel.lastError,
      })),
      conversations: conversations.map((conversation): InboxConversationItem => ({
        id: conversation.id,
        channel: conversation.channel,
        status: conversation.status,
        customerName: conversation.customerName,
        customerContact: conversation.customerContact,
        messageCount: conversation.messageCount,
        lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
        escalatedToHuman: conversation.escalatedToHuman,
        summary: conversation.summary,
        messages: conversation.messages.map((message) => ({
          id: message.id,
          role: message.role,
          direction: message.direction,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
          delivery: message.deliveries[0]
            ? {
                status: message.deliveries[0].status,
                providerMessageId: message.deliveries[0].providerMessageId,
                error: message.deliveries[0].error,
              }
            : null,
        })),
        handoffs: conversation.handoffs.map((handoff) => ({
          id: handoff.id,
          status: handoff.status,
          reason: handoff.reason,
          priority: handoff.priority,
          assignedTo: handoff.assignedTo,
        })),
      })),
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("LABS_SESSION")) {
      redirect("https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs%2Finbox");
    }
    redirect("https://app.vase.ar/app");
  }
}

export default async function LabsInboxPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await getInboxData();
  const requested = (await searchParams)?.conversationId;
  const initialActiveId = typeof requested === "string" ? requested : undefined;
  const channelParam = (await searchParams)?.channel;
  const initialChannel = typeof channelParam === "string" ? channelParam : undefined;

  // Los números y el resumen ya están en Inicio: acá queda solo la bandeja para responder.
  return (
    <InboxWorkstation
      tenantSlug={data.tenantSlug}
      initialConversations={data.conversations}
      channelStates={data.channelStates}
      insights={data.insights}
      initialActiveId={initialActiveId}
      initialChannel={initialChannel}
    />
  );
}
