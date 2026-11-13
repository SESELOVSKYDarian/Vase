import Link from "next/link";
import { PanelSection, PanelSections } from "@vase/ui/panel";
import { labsPrisma } from "../../../../lib/db";
import { groupKnowledgeItems } from "../../../../lib/knowledge-source";
import { resolveAssistantContext } from "./assistant-data";
import { KnowledgeAddModal } from "./knowledge-add-modal";
import { KnowledgeGroups } from "./knowledge-groups";

export const dynamic = "force-dynamic";

/** Asistente › Qué sabe: los documentos, preguntas frecuentes y webs que usa para responder. */
export default async function LabsAssistantKnowsPage() {
  const resolved = await resolveAssistantContext("/app/owner/labs/chatbots");
  const data = { items: await labsPrisma.knowledgeItem.findMany({
    where: { assistantId: resolved.assistant.id },
    orderBy: { updatedAt: "desc" },
    take: 24,
  }) };
  const ready = data.items.filter((item) => item.status === "READY").length;

  return (
    <PanelSections>
      <PanelSection
        title="Lo que sabe"
        summary={data.items.length ? `${ready} de ${data.items.length} documentos listos para responder` : "Todavía sin documentos"}
        defaultOpen
      >
        <div id="knowledge-sources-focus-target" role="region" aria-label="Fuentes de conocimiento" tabIndex={-1} className="labs-knowledge-focus-target">
          {data.items.length === 0 ? (
            <div className="vpa-empty">
              <p>Todavía no agregaste conocimiento. Sumá precios, preguntas frecuentes o tu web para que responda con información de tu negocio.</p>
              <div style={{ marginTop: 14 }}>
                <KnowledgeAddModal />
              </div>
            </div>
          ) : (
            <>
              <div className="labs-tabs-row" style={{ marginBottom: 12 }}>
                <span className="vpa-mut">
                  Tus productos y precios los toma del <Link href="/anterior/knowledge/catalog" className="vpa-lnk">Catálogo</Link>.
                </span>
                <KnowledgeAddModal />
              </div>
              <KnowledgeGroups groups={groupKnowledgeItems(data.items)} />
            </>
          )}
        </div>
      </PanelSection>
    </PanelSections>
  );
}
