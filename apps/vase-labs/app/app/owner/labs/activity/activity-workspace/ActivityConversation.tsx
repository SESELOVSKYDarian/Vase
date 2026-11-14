// Parte de activity-workspace.tsx: ACTIVITY_INTENT_LABELS, ActivityIntentFilter, ActivitySort, ActivityChannelFilter, ACTIVITY_CHANNEL_LABELS, ActivityInsight y más.
import { type CSSProperties, type ReactNode } from "react";
import { BrainCircuit, Clock3, MessageCircle, MessageSquareText, Send } from "lucide-react";

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
export type ActivityChannelFilter = "all" | "WHATSAPP" | "INSTAGRAM" | "FACEBOOK";
export const ACTIVITY_CHANNEL_LABELS: Record<ActivityChannelFilter, string> = {
  all: "Todos los canales", WHATSAPP: "WhatsApp", INSTAGRAM: "Instagram", FACEBOOK: "Facebook",
};

export type ActivityInsight = {
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
  handoffs: Array<{ id: string }>;
  insight: ActivityInsight | null;
  analysisJob: {
    status: string;
    updatedAt: Date;
  } | null;
};

export const INTENT_TONES: Record<string, string> = {
  HOT_LEAD: "is-hot",
  HUMAN_REQUESTED: "is-human",
  RESEARCHING: "is-researching",
  LOW_INTENT: "is-low",
  UNCLASSIFIED: "is-unclassified",
};

export function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

export function readContext(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const context = (metadata as Record<string, unknown>).context;
  return context && typeof context === "object" && !Array.isArray(context)
    ? context as Record<string, unknown>
    : {};
}

export function isActiveAiReplyError(conversation: ActivityConversation, failedAt: number) {
  const latestOutboundAt = conversation.messages
    .filter((message) => message.role === "assistant" || message.direction === "OUTBOUND")
    .reduce((latest, message) => Math.max(latest, message.createdAt.getTime()), 0);
  return !Number.isFinite(failedAt) || latestOutboundAt <= failedAt;
}

export function resolveAiStatus(conversation: ActivityConversation) {
  const context = readContext(conversation.metadata);
  if (typeof context.aiReplyError === "string" && context.aiReplyError) {
    const failedAt = typeof context.aiReplyFailedAt === "string"
      ? Date.parse(context.aiReplyFailedAt)
      : Number.NaN;
    if (isActiveAiReplyError(conversation, failedAt)) {
      return "Respuesta IA con error";
    }
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

export function readAiReplyError(conversation: ActivityConversation) {
  const context = readContext(conversation.metadata);
  if (typeof context.aiReplyError !== "string" || !context.aiReplyError) return null;
  const failedAt = typeof context.aiReplyFailedAt === "string"
    ? Date.parse(context.aiReplyFailedAt)
    : Number.NaN;
  return isActiveAiReplyError(conversation, failedAt) ? context.aiReplyError : null;
}

export function resolveIntent(conversation: ActivityConversation) {
  if (
    conversation.escalatedToHuman
    || conversation.status === "ESCALATED"
    || conversation.handoffs.length > 0
  ) {
    return "HUMAN_REQUESTED";
  }
  const label = conversation.insight?.intentLabel ?? conversation.intentLabel ?? "UNCLASSIFIED";
  return label in ACTIVITY_INTENT_LABELS ? label : "UNCLASSIFIED";
}

export function formatDate(value: Date | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(value);
}

export function ChannelIdentity({ channel }: { channel: string | null }) {
  const normalized = channel === "WHATSAPP" || channel === "INSTAGRAM" || channel === "FACEBOOK" ? channel : "LABS";
  const label = normalized === "WHATSAPP" ? "WhatsApp" : normalized === "INSTAGRAM" ? "Instagram" : normalized === "FACEBOOK" ? "Facebook" : "Vase Labs";
  const Icon = normalized === "WHATSAPP" ? MessageCircle : normalized === "INSTAGRAM" ? Send : normalized === "FACEBOOK" ? MessageSquareText : MessageSquareText;
  return <span className="inline-flex items-center gap-1" aria-label={`Canal: ${label}`}><Icon size={14} aria-hidden="true" />{label}</span>;
}

export function ScoreMeter({ score }: { score: number | null }) {
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

export function AnalysisState({ conversation }: { conversation: ActivityConversation }) {
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

export function DetailList({
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

export function PrimarySignal({
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

export function hrefFor(intent: ActivityIntentFilter, sort: ActivitySort, channel: ActivityChannelFilter) {
  return `/owner/activity?intent=${encodeURIComponent(intent)}&sort=${encodeURIComponent(sort)}&channel=${encodeURIComponent(channel)}`;
}
