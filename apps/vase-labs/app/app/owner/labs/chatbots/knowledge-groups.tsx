import type { KnowledgeSourceType } from "../../../../lib/knowledge-source";
import { LabsStatusPill } from "../labs-ui";

type Item = { id: string; title: string; status: string; updatedAt: Date };
type Group = { type: KnowledgeSourceType; items: Item[] };

const labels: Record<KnowledgeSourceType, string> = {
  FILE: "Documentos y archivos",
  URL: "URLs",
  FAQ: "Preguntas frecuentes",
  VASE_MANAGEMENT: "Vase Management",
  EXTERNAL_MANAGEMENT: "Sistema de gestión externo",
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
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{group.items.map((item) => (
        <article key={item.id} className="labs-subpanel p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
            <LabsStatusPill label={item.status} tone={tone(item.status)} />
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Actualizado {dateFormatter.format(item.updatedAt)}</p>
        </article>
      ))}</div>
    </section>
  ))}</div>;
}
