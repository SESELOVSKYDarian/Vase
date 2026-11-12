import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PanelFacts, PanelNotice, PanelSection, PanelSections } from "@vase/ui/panel";
import { fetchBusinessProfile, MI_NEGOCIO_URL, type VaseBusinessProfile } from "../../../../lib/business-profile";
import { labsPrisma } from "../../../../lib/db";
import { groupKnowledgeItems } from "../../../../lib/knowledge-source";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { AssistantPromptCard } from "./assistant-prompt-card";
import { KnowledgeAddModal } from "./knowledge-add-modal";
import { KnowledgeGroups } from "./knowledge-groups";
import { TrainerPhoneManager } from "./trainer-phone-manager";
import { TrainerRevisionHistory } from "./trainer-revision-history";

export const dynamic = "force-dynamic";

async function getKnowledgeData() {
  const requestHeaders = await headers();

  try {
    const resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
    const [items, trainerPhones, trainerRevisions, profile] = await Promise.all([
      labsPrisma.knowledgeItem.findMany({
        where: { assistantId: resolved.assistant.id },
        orderBy: { updatedAt: "desc" },
        take: 24,
      }),
      labsPrisma.trainerPhone.findMany({ where: { globalTenantId: resolved.context.globalTenantId }, orderBy: { createdAt: "desc" } }),
      labsPrisma.knowledgeRevision.findMany({ where: { globalTenantId: resolved.context.globalTenantId }, orderBy: { revision: "desc" }, take: 20, select: { id: true, revision: true, knowledgeItemId: true, createdAt: true, revertedAt: true } }),
      fetchBusinessProfile(resolved.context.globalTenantId),
    ]);

    return { assistant: resolved.assistant, items, trainerPhones, trainerRevisions, profile };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("LABS_SESSION")) {
      redirect("https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs%2Fchatbots");
    }
    redirect("https://app.vase.ar/app");
  }
}

function businessFacts(profile: VaseBusinessProfile | null) {
  if (!profile) return [];
  const socials = (profile.socialLinks ?? []).map((link) => link.url).filter(Boolean);
  const branches = (profile.branches ?? []).map((branch) => branch.name).filter(Boolean);
  return [
    { label: "Nombre", value: profile.name },
    { label: "Rubro", value: profile.industry },
    { label: "Horarios", value: profile.hours },
    { label: "WhatsApp", value: profile.whatsapp },
    { label: "Teléfono", value: profile.phone },
    { label: "Correo", value: profile.email },
    { label: "Sucursales", value: branches.length ? branches.join(" · ") : null },
    { label: "Redes", value: socials.length ? `${socials.length} ${socials.length === 1 ? "red" : "redes"}` : null },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value));
}

export default async function LabsAssistantPage() {
  const data = await getKnowledgeData();
  const readySources = data.items.filter((item) => item.status === "READY").length;
  const facts = businessFacts(data.profile);
  const activeTrainers = data.trainerPhones.filter((phone) => phone.active).length;

  return (
    <>
      <PanelNotice title="Tu asistente responde con lo que cargás acá y con los datos de Mi negocio.">Tocá una sección para abrirla.</PanelNotice>
      <PanelSections>
        <PanelSection
          title="Datos del negocio"
          summary={facts.length ? facts.slice(0, 3).map((fact) => fact.value).join(" · ") : "Todavía no cargaste horarios, contacto ni sucursales"}
          badge={<span className="vpa-chip2">De Mi negocio</span>}
          defaultOpen={!facts.length}
        >
          {facts.length ? <PanelFacts items={facts} /> : null}
          <div className="vpa-from" style={facts.length ? undefined : { marginTop: 0 }}>
            <span>Se cargan una sola vez en Mi negocio y los usan todos tus productos. No hace falta repetirlos en las instrucciones.</span>
            <a href={MI_NEGOCIO_URL} className="vpa-btn line sm">
              {facts.length ? "Editar en Mi negocio" : "Cargar en Mi negocio"}
            </a>
          </div>
        </PanelSection>

        <PanelSection title="Cómo responde" summary={data.assistant.systemPrompt?.trim() ? data.assistant.systemPrompt.trim().slice(0, 90) : "Todavía sin instrucciones"}>
          <AssistantPromptCard initialPrompt={data.assistant.systemPrompt} />
        </PanelSection>

        <PanelSection
          title="Lo que sabe"
          summary={data.items.length ? `${readySources} de ${data.items.length} documentos listos para responder` : "Todavía sin documentos"}
          defaultOpen
        >
          <div id="knowledge-sources-focus-target" role="region" aria-label="Fuentes de conocimiento" tabIndex={-1} className="labs-knowledge-focus-target">
          {data.items.length === 0 ? (
            <div className="vpa-empty"><p>Todavía no agregaste conocimiento. Sumá precios, preguntas frecuentes o tu web para que responda con información de tu negocio.</p><div style={{ marginTop: 14 }}><KnowledgeAddModal /></div></div>
          ) : (
            <>
              <div className="labs-tabs-row" style={{ marginBottom: 12 }}><span className="vpa-mut">El catálogo de tu tienda se suma solo desde Vase Business.</span><KnowledgeAddModal /></div>
              <KnowledgeGroups groups={groupKnowledgeItems(data.items)} />
            </>
          )}
          </div>
        </PanelSection>

        <PanelSection
          title="Enseñale desde WhatsApp"
          summary={activeTrainers ? `${activeTrainers} ${activeTrainers === 1 ? "teléfono puede" : "teléfonos pueden"} enseñarle con audios o mensajes` : "Sumá un teléfono para enseñarle con audios o mensajes"}
        >
          <TrainerPhoneManager phones={data.trainerPhones} />
          <TrainerRevisionHistory revisions={data.trainerRevisions} />
        </PanelSection>
      </PanelSections>
    </>
  );
}
