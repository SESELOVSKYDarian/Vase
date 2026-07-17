import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { groupKnowledgeItems } from "../../../../lib/knowledge-source";
import { LabsPageHeader, LabsSection } from "../labs-ui";
import { KnowledgeAddModal } from "./knowledge-add-modal";
import { KnowledgeGroups } from "./knowledge-groups";

export const dynamic = "force-dynamic";

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

      <LabsSection title="Base de conocimiento" description={`${data.items.length} fuentes cargadas`}>
        {data.items.length === 0 ? (
          <div className="labs-empty-state px-6 py-10 text-center"><h2 className="text-lg font-semibold">Todavía no agregaste conocimiento</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--muted)]">Sumá una fuente para que el asistente pueda responder con información de tu negocio.</p><div className="mt-6"><KnowledgeAddModal /></div></div>
        ) : (
          <><div className="mb-5 flex justify-end"><KnowledgeAddModal /></div><KnowledgeGroups groups={groupKnowledgeItems(data.items)} /></>
        )}
      </LabsSection>
    </div>
  );
}
