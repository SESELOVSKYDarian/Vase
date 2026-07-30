import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { LabsPageHeader, LabsSection, LabsStatusPill } from "../labs-ui";
import { InboxWorkstation, type InboxConversationItem } from "./inbox-workstation";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

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

export default async function LabsInboxPage() {
  const data = await getInboxData();
  const totalConversations = data.conversations.length;
  const humanAttentionCount = data.conversations.filter(
    (conversation) => conversation.escalatedToHuman || conversation.handoffs.length > 0,
  ).length;
  const totalMessages = data.conversations.reduce(
    (total, conversation) => total + conversation.messageCount,
    0,
  );
  const latestActivity = data.conversations[0]?.lastMessageAt ?? null;

  return (
    <div className="labs-inbox-page space-y-6">
      <LabsPageHeader
        eyebrow="Atencion"
        title="Inbox"
        description="Conversaciones abiertas y derivaciones que requieren seguimiento del equipo."
      />

      <section className="labs-inbox-summary-grid" aria-label="Resumen del inbox">
        <article>
          <span>Abiertas</span>
          <strong>{totalConversations}</strong>
          <small>Conversaciones en seguimiento</small>
        </article>
        <article>
          <span>Humanas</span>
          <strong>{humanAttentionCount}</strong>
          <small>Requieren intervencion del equipo</small>
        </article>
        <article>
          <span>Mensajes</span>
          <strong>{totalMessages}</strong>
          <small>Ultimos hilos cargados</small>
        </article>
        <article>
          <span>Ultima actividad</span>
          <strong>{latestActivity ? formatDate(latestActivity) : "Sin fecha"}</strong>
          <small>Ordenado por prioridad reciente</small>
        </article>
      </section>

      <LabsSection
        title="Pendientes de atencion"
        description="Ordenados por la actividad mas reciente para que el equipo priorice la respuesta."
        className="labs-inbox-board-section"
      >
        <InboxWorkstation
          tenantSlug={data.tenantSlug}
          initialConversations={data.conversations}
          channelStates={data.channelStates}
        />
      </LabsSection>

      {data.conversations.length > 0 ? (
        <LabsSection title="Resumen rapido" description="Vista compacta para revision y auditoria del equipo.">
          <div className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-lg border border-[var(--border-subtle)]">
            {data.conversations.map((conversation) => {
              const latestMessage = conversation.messages.at(-1);
              const activeHandoff = conversation.handoffs[0];
              const messageAuthor = latestMessage?.direction === "OUTBOUND" ? "Equipo" : "Cliente";

              return (
                <article
                  key={conversation.id}
                  className="grid gap-3 bg-[var(--surface)] p-4 lg:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-semibold text-[var(--foreground)]">
                        {conversation.customerName ?? conversation.customerContact ?? "Cliente"}
                      </p>
                      <span className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--muted-soft)]">
                        {conversation.channel ?? "LABS"}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                      {latestMessage ? `${messageAuthor}: ${latestMessage.content}` : conversation.summary ?? "Conversacion sin mensajes disponibles."}
                    </p>
                    {activeHandoff ? (
                      <p className="mt-2 text-xs leading-5 text-[var(--muted-soft)]">
                        Derivacion: {activeHandoff.reason}
                        {activeHandoff.assignedTo ? ` · Responsable: ${activeHandoff.assignedTo}` : ""}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:max-w-xs lg:justify-end">
                    <LabsStatusPill
                      label={conversation.status}
                      tone={conversation.status === "ESCALATED" ? "warning" : "info"}
                    />
                    {activeHandoff ? (
                      <LabsStatusPill
                        label={`${activeHandoff.status} · ${activeHandoff.priority}`}
                        tone="warning"
                      />
                    ) : null}
                    <span className="text-xs text-[var(--muted)]">
                      {conversation.messageCount} mensajes · {formatDate(conversation.lastMessageAt)}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </LabsSection>
      ) : null}
    </div>
  );
}
