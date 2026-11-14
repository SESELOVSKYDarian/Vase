// Parte de activity-workspace.tsx: ActivityWorkspace.
import Link from "next/link";
import { ArrowUpRight, ChevronDown, MessageSquareText } from "lucide-react";
import { LabsEmptyState } from "../../labs-ui";
import { ACTIVITY_CHANNEL_LABELS, ACTIVITY_INTENT_LABELS, ActivityChannelFilter, ActivityConversation, ActivityIntentFilter, ActivitySort, AnalysisState, ChannelIdentity, DetailList, INTENT_TONES, PrimarySignal, ScoreMeter, formatDate, hrefFor, readAiReplyError, readStringArray, resolveAiStatus, resolveIntent } from "./ActivityConversation";

export default function ActivityWorkspace({
  conversations,
  activeIntent,
  activeSort,
  activeChannel,
}: {
  conversations: ActivityConversation[];
  activeIntent: ActivityIntentFilter;
  activeSort: ActivitySort;
  activeChannel: ActivityChannelFilter;
}) {
  return (
    <div className="labs-activity-workspace">
      <div className="labs-activity-controls">
        <nav aria-label="Filtrar conversaciones por intención">
          {Object.entries(ACTIVITY_INTENT_LABELS).map(([intent, label]) => (
            <Link
              key={intent}
              href={hrefFor(intent as ActivityIntentFilter, activeSort, activeChannel) as never}
              aria-current={activeIntent === intent ? "page" : undefined}
              className={activeIntent === intent ? "is-active" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Filtrar conversaciones por canal">
          {Object.entries(ACTIVITY_CHANNEL_LABELS).map(([channel, label]) => (
            <Link key={channel} href={hrefFor(activeIntent, activeSort, channel as ActivityChannelFilter) as never}
              aria-current={activeChannel === channel ? "page" : undefined}
              className={activeChannel === channel ? "is-active" : undefined}>{label}</Link>
          ))}
        </nav>
        <div className="labs-activity-sort" role="group" aria-label="Ordenar conversaciones">
          <span>Orden</span>
          <Link
            href={hrefFor(activeIntent, "latest", activeChannel) as never}
            aria-current={activeSort === "latest" ? "page" : undefined}
            className={activeSort === "latest" ? "is-active" : undefined}
          >
            Más recientes
          </Link>
          <Link
            href={hrefFor(activeIntent, "score", activeChannel) as never}
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
            const aiReplyError = readAiReplyError(conversation);
            return (
              <article className="labs-activity-card" key={conversation.id}>
                <header>
                  <div className="labs-activity-identity">
                    <p><ChannelIdentity channel={conversation.channel} /> · {formatDate(conversation.lastMessageAt)}</p>
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
                    {aiReplyError ? <DetailList title="Error IA" items={[aiReplyError]} /> : null}
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
