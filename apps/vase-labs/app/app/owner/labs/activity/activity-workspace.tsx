import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BrainCircuit,
  ChevronDown,
  Clock3,
  MessageSquareText,
} from "lucide-react";
import { LabsEmptyState } from "../labs-ui";

export const ACTIVITY_INTENT_LABELS = {
  all: "Todas",
  HOT_LEAD: "Hot lead",
  HUMAN_REQUESTED: "Solicitó humano",
  RESEARCHING: "Investigando",
  LOW_INTENT: "Baja intención",
  UNCLASSIFIED: "Sin clasificar",
} as const;

export type ActivityIntentFilter = keyof typeof ACTIVITY_INTENT_LABELS;
export type ActivitySort = "latest" | "score";

type ActivityInsight = {
  summary: string;
  currentNeed: string;
  productInterests: unknown;
  preferences: unknown;
  objections: unknown;
  budgetSignals: unknown;
  urgencySignals: unknown;
  recommendations: unknown;
  nextBestAction: string;
  scoreReasons: unknown;
  identitySignals: unknown;
  leadScore: number;
  intentLabel: string;
  analyzedAt: Date;
};

export type ActivityConversation = {
  id: string;
  channel: string | null;
  status: string;
  customerName: string | null;
  customerContact: string | null;
  summary: string | null;
  intentLabel: string | null;
  intentScore: number | null;
  escalatedToHuman: boolean;
  lastMessageAt: Date | null;
  metadata: unknown;
  messages: Array<{
    id: string;
    role: string;
    direction: string | null;
    content: string;
    createdAt: Date;
  }>;
  insight: ActivityInsight | null;
  analysisJob: {
    status: string;
    updatedAt: Date;
  } | null;
};

const INTENT_TONES: Record<string, string> = {
  HOT_LEAD: "is-hot",
  HUMAN_REQUESTED: "is-human",
  RESEARCHING: "is-researching",
  LOW_INTENT: "is-low",
  UNCLASSIFIED: "is-unclassified",
};

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function readContext(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const context = (metadata as Record<string, unknown>).context;
  return context && typeof context === "object" && !Array.isArray(context)
    ? context as Record<string, unknown>
    : {};
}

function resolveAiStatus(conversation: ActivityConversation) {
  const context = readContext(conversation.metadata);
  if (typeof context.aiReplyError === "string" && context.aiReplyError) {
    return "Respuesta IA con error";
  }
  if (typeof context.aiBlockedReason === "string" && context.aiBlockedReason) {
    return "IA pausada";
  }
  return conversation.messages.some(
    (message) => message.role === "assistant" || message.direction === "OUTBOUND",
  )
    ? "IA respondió"
    : "Esperando respuesta IA";
}

function resolveIntent(conversation: ActivityConversation) {
  if (conversation.escalatedToHuman) return "HUMAN_REQUESTED";
  const label = conversation.insight?.intentLabel ?? conversation.intentLabel ?? "UNCLASSIFIED";
  return label in ACTIVITY_INTENT_LABELS ? label : "UNCLASSIFIED";
}

function formatDate(value: Date | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(value);
}

function ScoreMeter({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <div className="labs-lead-score is-empty" aria-label="Sin score disponible">
        <span aria-hidden="true">—</span>
        <small>Sin score</small>
      </div>
    );
  }
  const safeScore = Math.min(100, Math.max(1, Math.round(score)));
  const style = { "--lead-score-value": `${safeScore * 3.6}deg` } as CSSProperties;
  return (
    <div
      className="labs-lead-score"
      role="meter"
      aria-label={`Score comercial: ${safeScore} de 100`}
      aria-valuemin={1}
      aria-valuemax={100}
      aria-valuenow={safeScore}
      style={style}
    >
      <strong>{safeScore}</strong>
      <small>/ 100</small>
    </div>
  );
}

function AnalysisState({ conversation }: { conversation: ActivityConversation }) {
  const status = conversation.analysisJob?.status;
  if (status === "QUEUED") {
    return <p className="labs-analysis-state is-pending"><Clock3 /> Análisis pendiente</p>;
  }
  if (status === "PROCESSING") {
    return <p className="labs-analysis-state is-processing"><BrainCircuit /> Analizando conversación</p>;
  }
  if (status === "FAILED") {
    return (
      <p className="labs-analysis-state is-failed">
        No pudimos actualizar el análisis. Conservamos el último resultado disponible.
      </p>
    );
  }
  if (status === "COMPLETED") {
    return <p className="labs-analysis-state is-complete"><BrainCircuit /> Análisis actualizado</p>;
  }
  return null;
}

function DetailList({
  title,
  items,
  empty,
}: {
  title: string;
  items: string[];
  empty?: string;
}) {
  if (items.length === 0 && !empty) return null;
  return (
    <section>
      <h4>{title}</h4>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : (
        <p>{empty}</p>
      )}
    </section>
  );
}

function PrimarySignal({
  eyebrow,
  children,
  icon,
}: {
  eyebrow: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="labs-activity-signal">
      <p>{icon}{eyebrow}</p>
      <strong>{children}</strong>
    </div>
  );
}

function hrefFor(intent: ActivityIntentFilter, sort: ActivitySort) {
  return `/owner/activity?intent=${encodeURIComponent(intent)}&sort=${encodeURIComponent(sort)}`;
}

export default function ActivityWorkspace({
  conversations,
  activeIntent,
  activeSort,
}: {
  conversations: ActivityConversation[];
  activeIntent: ActivityIntentFilter;
  activeSort: ActivitySort;
}) {
  return (
    <div className="labs-activity-workspace">
      <div className="labs-activity-controls">
        <nav aria-label="Filtrar conversaciones por intención">
          {Object.entries(ACTIVITY_INTENT_LABELS).map(([intent, label]) => (
            <Link
              key={intent}
              href={hrefFor(intent as ActivityIntentFilter, activeSort) as never}
              aria-current={activeIntent === intent ? "page" : undefined}
              className={activeIntent === intent ? "is-active" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="labs-activity-sort" role="group" aria-label="Ordenar conversaciones">
          <span>Orden</span>
          <Link
            href={hrefFor(activeIntent, "latest") as never}
            aria-current={activeSort === "latest" ? "page" : undefined}
            className={activeSort === "latest" ? "is-active" : undefined}
          >
            Más recientes
          </Link>
          <Link
            href={hrefFor(activeIntent, "score") as never}
            aria-current={activeSort === "score" ? "page" : undefined}
            className={activeSort === "score" ? "is-active" : undefined}
          >
            Mayor score
          </Link>
        </div>
      </div>

      {conversations.length === 0 ? (
        <LabsEmptyState
          title="No hay conversaciones para este filtro"
          description="Probá otra clasificación o volvé a ver toda la actividad."
        />
      ) : (
        <div className="labs-activity-list">
          {conversations.map((conversation) => {
            const detail = conversation.insight;
            const intent = resolveIntent(conversation);
            const score = detail?.leadScore ?? conversation.intentScore;
            const summary = detail?.summary
              ?? conversation.summary
              ?? conversation.messages[0]?.content
              ?? "Todavía no hay un resumen disponible.";
            return (
              <article className="labs-activity-card" key={conversation.id}>
                <header>
                  <div className="labs-activity-identity">
                    <p>{conversation.channel ?? "LABS"} · {formatDate(conversation.lastMessageAt)}</p>
                    <h2>{conversation.customerName ?? conversation.customerContact ?? "Cliente sin identificar"}</h2>
                    {conversation.customerName && conversation.customerContact
                      ? <span>{conversation.customerContact}</span>
                      : null}
                  </div>
                  <div className="labs-activity-card-status">
                    <span className={`labs-intent-label ${INTENT_TONES[intent]}`}>
                      {ACTIVITY_INTENT_LABELS[intent as keyof typeof ACTIVITY_INTENT_LABELS]}
                    </span>
                    <span>{resolveAiStatus(conversation)}</span>
                  </div>
                  <ScoreMeter score={score} />
                </header>

                <AnalysisState conversation={conversation} />

                <div className="labs-activity-summary">
                  <p>{summary}</p>
                  <div>
                    <PrimarySignal eyebrow="Necesidad actual" icon={<MessageSquareText />}>
                      {detail?.currentNeed || "Todavía no hay una necesidad detectada."}
                    </PrimarySignal>
                    <PrimarySignal eyebrow="Próxima mejor acción" icon={<ArrowUpRight />}>
                      {detail?.nextBestAction || "Esperar más contexto antes de avanzar."}
                    </PrimarySignal>
                  </div>
                </div>

                {detail && readStringArray(detail.scoreReasons).length > 0 ? (
                  <div className="labs-score-reasons" aria-label="Motivos del score">
                    {readStringArray(detail.scoreReasons).map((reason) => (
                      <span key={reason}>{reason}</span>
                    ))}
                  </div>
                ) : null}

                <details className="labs-activity-detail">
                  <summary>
                    <span>{detail ? "Ver inteligencia completa" : "Ver estado del análisis"}</span>
                    <ChevronDown aria-hidden="true" />
                  </summary>
                  <div>
                    {detail ? (
                      <>
                        <DetailList title="Productos de interés" items={readStringArray(detail.productInterests)} />
                        <DetailList title="Preferencias" items={readStringArray(detail.preferences)} />
                        <DetailList title="Objeciones" items={readStringArray(detail.objections)} />
                        <DetailList title="Recomendaciones" items={readStringArray(detail.recommendations)} />
                        <DetailList title="Señales de presupuesto" items={readStringArray(detail.budgetSignals)} />
                        <DetailList title="Señales de urgencia" items={readStringArray(detail.urgencySignals)} />
                        <DetailList title="Señales de identidad" items={readStringArray(detail.identitySignals)} />
                      </>
                    ) : (
                      <DetailList
                        title="Sin análisis comercial detallado"
                        items={[]}
                        empty="La conversación conserva su resumen y clasificación anterior mientras llega un nuevo análisis."
                      />
                    )}
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
