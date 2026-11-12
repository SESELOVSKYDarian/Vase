import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { LabsSection } from "../labs-ui";
import { CONVERSATION_TABS, LabsTabs } from "../labs-tabs";
import { InboxWorkstation, type InboxConversationItem } from "./inbox-workstation";

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

    return {
      tenantSlug: resolved.context.tenantSlug,
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

  // Los números y el resumen ya están en Inicio: acá queda solo la bandeja para responder.
  return (
    <div className="labs-inbox-page space-y-6">
      <LabsTabs tabs={CONVERSATION_TABS} />
      <LabsSection className="labs-inbox-board-section">
        <InboxWorkstation
          tenantSlug={data.tenantSlug}
          initialConversations={data.conversations}
          channelStates={data.channelStates}
          initialActiveId={initialActiveId}
        />
      </LabsSection>
    </div>
  );
}
