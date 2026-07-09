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

async function getActivityData() {
  const requestHeaders = await headers();

  try {
    const resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
    const conversations = await labsPrisma.conversation.findMany({
      where: { assistantId: resolved.assistant.id },
      orderBy: { lastMessageAt: "desc" },
      take: 40,
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
                    {conversation.summary ?? "Sin resumen disponible"}
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
