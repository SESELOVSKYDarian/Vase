import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { LabsEmptyState, LabsPageHeader, LabsSection, LabsStatusPill } from "../labs-ui";

export const dynamic = "force-dynamic";

function trainingTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  if (status === "READY") return "success";
  if (status === "FAILED") return "danger";
  if (status === "PROCESSING" || status === "QUEUED") return "warning";
  return "neutral";
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

async function getKnowledgeData() {
  const requestHeaders = await headers();

  try {
    const resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
    const items = await labsPrisma.knowledgeItem.findMany({
      where: { assistantId: resolved.assistant.id },
      orderBy: { updatedAt: "desc" },
      take: 24,
    });

    return { items };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("LABS_SESSION")) {
      redirect("https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs%2Fchatbots");
    }
    redirect("https://app.vase.ar/app");
  }
}

export default async function LabsChatbotsPage() {
  const data = await getKnowledgeData();

  return (
    <div className="space-y-6">
      <LabsPageHeader
        eyebrow="Conocimiento"
        title="Chatbots"
        description="Fuentes, entrenamiento y estado del conocimiento que usa el asistente de Vase Labs."
      />

      <LabsSection title="Knowledge base" description={`${data.items.length} fuentes cargadas`}>
        {data.items.length === 0 ? (
          <LabsEmptyState title="Sin conocimiento cargado" description="Cuando agregues FAQs, archivos o URLs van a aparecer en esta vista." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((item) => (
              <article key={item.id} className="conversation-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
                  <LabsStatusPill label={item.status} tone={trainingTone(item.status)} />
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{item.sourceType} - {formatDate(item.updatedAt)}</p>
              </article>
            ))}
          </div>
        )}
      </LabsSection>
    </div>
  );
}
