import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { LabsEmptyState, LabsPageHeader, LabsSection, LabsStatusPill } from "../labs-ui";

export const dynamic = "force-dynamic";

function conversationTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  if (status === "ESCALATED") return "warning";
  if (status === "CLOSED") return "neutral";
  return "info";
}

function formatDate(value: Date | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function readConversationContext(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const context = (metadata as Record<string, unknown>).context;
  return context && typeof context === "object" && !Array.isArray(context)
    ? context as Record<string, unknown>
    : {};
}

function aiStatusLabel(conversation: {
  metadata: unknown;
  messages?: Array<{ role: string; direction: string | null }>;
}) {
  const context = readConversationContext(conversation.metadata);
  if (typeof context.aiReplyError === "string" && context.aiReplyError) {
    return `IA fallida: ${context.aiReplyError}`;
  }
  if (typeof context.aiBlockedReason === "string" && context.aiBlockedReason) {
    return `IA bloqueada: ${context.aiBlockedReason}`;
  }
  return conversation.messages?.some((message) => message.role === "assistant" || message.direction === "OUTBOUND")
    ? "IA respondio"
    : "Esperando respuesta IA";
}

async function getActivityData() {
  const requestHeaders = await headers();

  try {
    const resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
    const conversations = await labsPrisma.conversation.findMany({
      where: { assistantId: resolved.assistant.id },
      orderBy: { lastMessageAt: "desc" },
      take: 40,
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 2,
          select: {
            id: true,
            role: true,
            direction: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    return { conversations };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("LABS_SESSION")) {
      redirect("https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs%2Factivity");
    }
    redirect("https://app.vase.ar/app");
  }
}

export default async function LabsActivityPage() {
  const data = await getActivityData();

  return (
    <div className="space-y-6">
      <LabsPageHeader
        eyebrow="Actividad"
        title="Analisis"
        description="Conversaciones recientes, intencion, estado y derivaciones humanas del asistente."
      />

      <LabsSection title="Conversaciones recientes">
        {data.conversations.length === 0 ? (
          <LabsEmptyState title="Sin actividad" description="Cuando entren mensajes al asistente se van a listar aca." />
        ) : (
          <div className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-lg border border-[var(--border-subtle)]">
            {data.conversations.map((conversation) => (
              <article key={conversation.id} className="grid gap-2 bg-[var(--surface)] p-4 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-semibold text-[var(--foreground)]">
                    {conversation.customerName ?? conversation.customerContact ?? "Cliente"} - {conversation.channel ?? "LABS"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                    {conversation.messages[0]?.content ?? conversation.summary ?? "Sin mensajes visibles"}
                  </p>
                  <p className="mt-2 text-xs font-bold text-[var(--muted-soft)]">
                    {aiStatusLabel(conversation)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <LabsStatusPill label={conversation.intentLabel ?? conversation.status} tone={conversation.escalatedToHuman ? "warning" : conversationTone(conversation.status)} />
                  <span className="text-xs text-[var(--muted)]">{formatDate(conversation.lastMessageAt)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </LabsSection>
    </div>
  );
}
