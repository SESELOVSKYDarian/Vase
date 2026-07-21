import { FileText, HelpCircle, Link2, Store } from "lucide-react";
import type { KnowledgeSourceType } from "../../../../lib/knowledge-source";
import { LabsStatusPill } from "../labs-ui";

type Item = { id: string; title: string; status: string; updatedAt: Date };
type KnowledgeGroupType = KnowledgeSourceType | "OTROS";
type Group = { type: KnowledgeGroupType; items: Item[] };

const labels: Record<KnowledgeGroupType, string> = {
  FILE: "Documentos y archivos",
  URL: "URLs",
  FAQ: "Preguntas frecuentes",
  VASE_MANAGEMENT: "Vase Management",
  EXTERNAL_MANAGEMENT: "Sistema de gestión externo",
  OTROS: "Otros",
};

const icons: Record<KnowledgeGroupType, typeof FileText> = {
  FILE: FileText,
  URL: Link2,
  FAQ: HelpCircle,
  VASE_MANAGEMENT: Store,
  EXTERNAL_MANAGEMENT: Store,
  OTROS: FileText,
};

function tone(status: string): "neutral" | "success" | "warning" | "danger" {
  if (status === "READY") return "success";
  if (status === "FAILED") return "danger";
  if (status === "QUEUED" || status === "PROCESSING") return "warning";
  return "neutral";
}

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" });

export function KnowledgeGroups({ groups }: { groups: Group[] }) {
  return <div className="space-y-6">{groups.map((group) => (
    <section key={group.type} aria-labelledby={`knowledge-${group.type}`}>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h3 id={`knowledge-${group.type}`} className="text-sm font-semibold text-[var(--foreground)]">{labels[group.type]}</h3>
        <span className="text-xs text-[var(--muted)]">{group.items.length} {group.items.length === 1 ? "fuente" : "fuentes"}</span>
      </div>
      <div className="labs-knowledge-source-list">{group.items.map((item) => {
        const Icon = icons[group.type];
        return (
          <article key={item.id} className="labs-knowledge-source-row">
            <span><Icon aria-hidden="true" /></span>
            <div>
              <p>{item.title}</p>
              <small>Actualizado {dateFormatter.format(item.updatedAt)}</small>
            </div>
            <LabsStatusPill label={item.status} tone={tone(item.status)} />
          </article>
        );
      })}</div>
    </section>
  ))}</div>;
}
