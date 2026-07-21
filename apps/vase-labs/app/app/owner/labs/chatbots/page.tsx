import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { groupKnowledgeItems } from "../../../../lib/knowledge-source";
import { getOpenAiModelProfiles } from "../../../../lib/openai-reply-generator";
import { LabsPageHeader, LabsSection } from "../labs-ui";
import { KnowledgeAddModal } from "./knowledge-add-modal";
import { KnowledgeGroups } from "./knowledge-groups";
import { ModelSelector } from "./model-selector";
import { OpenAiKeyCard } from "./openai-key-card";

export const dynamic = "force-dynamic";

async function getKnowledgeData() {
  const requestHeaders = await headers();

  try {
    const resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
    const [items, openAiKey] = await Promise.all([
      labsPrisma.knowledgeItem.findMany({
        where: { assistantId: resolved.assistant.id },
        orderBy: { updatedAt: "desc" },
        take: 24,
      }),
      (labsPrisma as any).assistantSecret.findUnique({
        where: { assistantId_kind: { assistantId: resolved.assistant.id, kind: "OPENAI_API_KEY" } },
        select: { id: true },
      }),
    ]);

    return { assistant: resolved.assistant, items, openAiKeyConfigured: Boolean(openAiKey) };
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
        eyebrow="Conocimiento / Chatbots"
        title="Base de conocimiento"
        description={data.items.length === 0 ? "Agregá información de tu negocio para empezar." : "Fuentes y estado del conocimiento que usa el asistente de Vase Labs."}
      />

      <ModelSelector profiles={getOpenAiModelProfiles()} currentModel={data.assistant.model} />
      <OpenAiKeyCard configured={data.openAiKeyConfigured} />

      {data.items.length === 0 ? (
        <div className="labs-empty-state px-6 py-10 text-center"><p className="mx-auto max-w-lg text-sm leading-6 text-[var(--muted)]">Todavía no agregaste conocimiento. Sumá una fuente para que el asistente responda con información de tu negocio.</p><div className="mt-6"><KnowledgeAddModal /></div></div>
      ) : (
        <LabsSection title="Base de conocimiento" description={`${data.items.length} fuentes cargadas`}><div className="mb-5 flex justify-end"><KnowledgeAddModal /></div><KnowledgeGroups groups={groupKnowledgeItems(data.items)} /></LabsSection>
      )}
    </div>
  );
}
