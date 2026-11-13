import Link from "next/link";
import { labsCatalogService } from "../../../../lib/catalog-repository";
import { labsPrisma } from "../../../../lib/db";
import { groupKnowledgeItems } from "../../../../lib/knowledge-source";
import { resolveAssistantContext } from "./assistant-data";
import { KnowledgeAddModal } from "./knowledge-add-modal";
import { KnowledgeGroups } from "./knowledge-groups";

export const dynamic = "force-dynamic";

/** Asistente › Qué sabe: lo que se actualiza solo (catálogo y Mi negocio) y lo que subiste vos. */
export default async function LabsAssistantKnowsPage() {
  const resolved = await resolveAssistantContext("/app/owner/labs/chatbots");
  const [items, products] = await Promise.all([
    labsPrisma.knowledgeItem.findMany({
      where: { assistantId: resolved.assistant.id },
      orderBy: { updatedAt: "desc" },
      take: 24,
    }),
    labsCatalogService.list(resolved.context.globalTenantId).catch(() => []),
  ]);
  const ready = items.filter((item) => item.status === "READY").length;

  return (
    <div className="vpa-stack" style={{ gap: 18 }}>
      <div className="lx-addhero">
        <div className="vpa-g1">
          <b>¿Qué más tiene que saber tu asistente?</b>
          <span>Listas de precios, preguntas frecuentes, políticas de envío o una página de tu web.</span>
        </div>
        <KnowledgeAddModal />
      </div>

      <section className="vpa-card">
        <div className="vpa-sech">
          <div className="vpa-g1">
            <h3>Se actualiza solo</h3>
            <p>Viene de tus otros productos y de Mi negocio. No tenés que cargar nada.</p>
          </div>
        </div>
        <div className="lx-srow">
          <span className="lx-chico" style={{ background: "#0d3b2a", color: "#7ff0bd" }} aria-hidden="true">B</span>
          <div className="vpa-g1">
            <b>Productos y precios</b>
            <span>{products.length ? `${products.length.toLocaleString("es-AR")} productos del catálogo` : "Todavía no llegó ningún producto"}</span>
          </div>
          <span className={products.length ? "vpa-tag g" : "vpa-tag"}><i />{products.length ? "Al día" : "Sin datos"}</span>
          <Link href="/owner/knowledge/catalog" className="vpa-btn line sm">Ver catálogo</Link>
        </div>
        <div className="lx-srow">
          <span className="lx-chico" style={{ background: "var(--soft)", color: "var(--tx)" }} aria-hidden="true">V</span>
          <div className="vpa-g1">
            <b>Datos de tu negocio</b>
            <span>Horarios, contacto y sucursales de Ajustes › Mi negocio</span>
          </div>
          <Link href="/owner/settings?tab=negocio" className="vpa-btn line sm">Ver</Link>
        </div>
      </section>

      <div id="knowledge-sources-focus-target" role="region" aria-label="Lo que subiste" tabIndex={-1} className="vpa-stack" style={{ gap: 18, outline: "none" }}>
        {items.length === 0 ? (
          <section className="vpa-card">
            <div className="vpa-sech">
              <div className="vpa-g1">
                <h3>Lo que subiste</h3>
                <p>Todavía nada. Sumá precios, preguntas frecuentes o tu web para que responda con información de tu negocio.</p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <p className="vpa-mut" style={{ margin: 0, fontSize: 12.5 }}>{ready} de {items.length} listos para responder.</p>
            <KnowledgeGroups groups={groupKnowledgeItems(items)} />
          </>
        )}
      </div>
    </div>
  );
}
