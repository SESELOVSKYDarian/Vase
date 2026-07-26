import { Bot, Database, Radio, ShieldCheck } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { labsPrisma } from "../../../../lib/db";
import { groupKnowledgeItems } from "../../../../lib/knowledge-source";
import { getOpenAiModelProfiles } from "../../../../lib/openai-reply-generator";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { LabsPageHeader, LabsSection } from "../labs-ui";
import { AssistantPromptCard } from "./assistant-prompt-card";
import { KnowledgeAddModal } from "./knowledge-add-modal";
import { KnowledgeGroups } from "./knowledge-groups";
import { ModelSelector } from "./model-selector";
import { OpenAiKeyCard } from "./openai-key-card";

export const dynamic = "force-dynamic";

async function getKnowledgeData() {
  const requestHeaders = await headers();

  try {
    const resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
    const [items, openAiKey, connectedChannels] = await Promise.all([
      labsPrisma.knowledgeItem.findMany({
        where: { assistantId: resolved.assistant.id },
        orderBy: { updatedAt: "desc" },
        take: 24,
      }),
      labsPrisma.assistantSecret.findUnique({
        where: { assistantId_kind: { assistantId: resolved.assistant.id, kind: "OPENAI_API_KEY" } },
        select: { id: true },
      }),
      labsPrisma.channel.count({
        where: { assistantId: resolved.assistant.id, status: "CONNECTED" },
      }),
    ]);

    return { assistant: resolved.assistant, items, connectedChannels, openAiKeyConfigured: Boolean(openAiKey) };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("LABS_SESSION")) {
      redirect("https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs%2Fchatbots");
    }
    redirect("https://app.vase.ar/app");
  }
}

export default async function LabsChatbotsPage() {
  const data = await getKnowledgeData();
  const readySources = data.items.filter((item) => item.status === "READY").length;

  return (
    <div className="labs-knowledge-page space-y-6">
      <div className="labs-knowledge-heading">
        <LabsPageHeader
          eyebrow="Conocimiento / Chatbots"
          title="Base de conocimiento"
          description="Configurá cómo responde tu chatbot, conectá OpenAI y administrá la información que usa en cada conversación."
        />
        <KnowledgeAddModal />
      </div>

      <section className="labs-knowledge-status" aria-label="Estado del chatbot">
        <div>
          <span className="labs-knowledge-status-icon"><ShieldCheck aria-hidden="true" /></span>
          <p>Conexión OpenAI</p>
          <strong>{data.openAiKeyConfigured ? "Lista para responder" : "Requiere una key"}</strong>
        </div>
        <div>
          <span className="labs-knowledge-status-icon"><Database aria-hidden="true" /></span>
          <p>Fuentes listas</p>
          <strong>{readySources} de {data.items.length}</strong>
        </div>
        <div>
          <span className="labs-knowledge-status-icon"><Radio aria-hidden="true" /></span>
          <p>Canales activos</p>
          <strong>{data.connectedChannels}</strong>
        </div>
        <div>
          <span className="labs-knowledge-status-icon"><Bot aria-hidden="true" /></span>
          <p>Modelo actual</p>
          <strong>{data.assistant.model}</strong>
        </div>
      </section>

      <div className="labs-knowledge-workspace">
        <div className="space-y-4">
          <AssistantPromptCard initialPrompt={data.assistant.systemPrompt} />
          <ModelSelector profiles={getOpenAiModelProfiles()} currentModel={data.assistant.model} />
          <OpenAiKeyCard configured={data.openAiKeyConfigured} />
        </div>
      </div>

      <div id="knowledge-sources-focus-target" role="region" aria-label="Fuentes de conocimiento" tabIndex={-1} className="labs-knowledge-focus-target">
        {data.items.length === 0 ? (
          <div className="labs-empty-state px-6 py-10 text-center"><p className="mx-auto max-w-lg text-sm leading-6 text-[var(--muted)]">Todavía no agregaste conocimiento. Sumá una fuente para que el asistente responda con información de tu negocio.</p><div className="mt-6"><KnowledgeAddModal /></div></div>
        ) : (
          <LabsSection title="Fuentes de conocimiento" description={`${readySources} de ${data.items.length} listas para responder`}><KnowledgeGroups groups={groupKnowledgeItems(data.items)} /></LabsSection>
        )}
      </div>
    </div>
  );
}
