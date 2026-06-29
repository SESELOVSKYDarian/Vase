import Link from "next/link";
import { Bot, Cable, Database, Flame, MessageSquare, Route, UserRoundCheck } from "lucide-react";
import { LabsConversationTrendChart, LabsIntentDistributionChart } from "@/components/labs/labs-analytics-charts";
import { LabsGuidedTour } from "@/components/labs/labs-guided-tour";
import { LabsActionLink, LabsEmptyState, LabsMetricCard, LabsPageHeader, LabsSection, LabsStatusPill } from "@/components/labs/labs-ui";
import { buildLabsConversationAnalytics } from "@/server/services/labs-analytics";
import { getLabsPlanLabel } from "@/lib/labs/plans";
import { conversationTone, formatDate, getLabsOwnerPageData, trainingTone } from "./_lib/labs-owner";
import { LabsModuleDisabledCard } from "./ui";

export default async function LabsDashboardPage() {
  const { dashboard, labsEnabled, membership } = await getLabsOwnerPageData();
  const analytics = buildLabsConversationAnalytics(dashboard.conversations);
  const pendingTrainingJobs = dashboard.trainingJobs.filter((job) => job.status === "QUEUED" || job.status === "PROCESSING").length;
  const readyTrainingJobs = dashboard.trainingJobs.filter((job) => job.status === "READY").length;
  const setupCompleted =
    dashboard.setupSteps.hasKnowledge && dashboard.setupSteps.hasChannel && dashboard.setupSteps.hasEscalation;
  const criticalConversations = dashboard.conversations
    .filter((conversation) => conversation.intentLabel === "HOT_LEAD" || conversation.escalatedToHuman)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <LabsPageHeader
        eyebrow="Operacion IA"
        title="Panel de control"
        description="Estado vivo de conversaciones, conocimiento, canales y derivaciones humanas."
        actions={
          <>
            <LabsGuidedTour tenantId={membership.tenantId} />
            <LabsActionLink href="/app/owner/labs/inbox">Abrir inbox</LabsActionLink>
            <Link href="/app/owner/labs/activity" className="labs-button labs-button-secondary">
              Analisis
            </Link>
          </>
        }
      />

      {!labsEnabled ? (
        <LabsModuleDisabledCard />
      ) : (
        <>
          <section data-labs-tour="metricas" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <LabsMetricCard label="Conversaciones abiertas" value={dashboard.summary.openConversations} icon={MessageSquare} tone="info" />
            <LabsMetricCard label="Derivadas a humano" value={dashboard.summary.escalatedConversations} icon={UserRoundCheck} tone="warning" />
            <LabsMetricCard label="Hot leads" value={analytics.hotLeads} icon={Flame} tone="success" />
            <LabsMetricCard label="Canales conectados" value={dashboard.summary.connectedChannels} icon={Cable} tone="info" />
            <LabsMetricCard label="Conocimiento cargado" value={dashboard.summary.knowledgeItems} icon={Database} tone="neutral" />
            <LabsMetricCard label="Training" value={`${readyTrainingJobs}/${dashboard.trainingJobs.length}`} detail={`${pendingTrainingJobs} pendientes`} icon={Bot} tone="neutral" />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <LabsSection title="Ritmo de conversaciones">
              <LabsConversationTrendChart analytics={analytics} />
            </LabsSection>
            <LabsSection title="Distribucion de intencion">
              <LabsIntentDistributionChart analytics={analytics} />
            </LabsSection>
          </section>

          <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
            <LabsSection title="Salud del setup" description={getLabsPlanLabel(dashboard.workspace.plan)}>
              <div className="grid gap-3">
                {[
                  ["Conocimiento", dashboard.setupSteps.hasKnowledge],
                  ["Canales", dashboard.setupSteps.hasChannel],
                  ["Escalamiento humano", dashboard.setupSteps.hasEscalation],
                ].map(([label, ok]) => (
                  <div key={String(label)} className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3">
                    <span className="text-sm font-semibold text-[var(--foreground)]">{label}</span>
                    <LabsStatusPill label={ok ? "Listo" : "Pendiente"} tone={ok ? "success" : "warning"} />
                  </div>
                ))}
              </div>
              {!setupCompleted ? (
                <Link href="/app/owner/labs/setup" className="labs-button labs-button-primary mt-4">
                  Completar setup
                  <Route className="size-4" />
                </Link>
              ) : null}
            </LabsSection>

            <LabsSection data-labs-tour="alertas" title="Conversaciones que piden atencion" actions={<Link href="/app/owner/labs/activity" className="labs-button labs-button-secondary">Ver todo</Link>}>
              {criticalConversations.length === 0 ? (
                <LabsEmptyState title="Sin conversaciones criticas" description="Los hot leads y derivaciones humanas apareceran aca." />
              ) : (
                <div className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-lg border border-[var(--border-subtle)]">
                  {criticalConversations.map((conversation) => (
                    <Link
                      key={conversation.id}
                      href={`/app/owner/labs/inbox?conversationId=${encodeURIComponent(conversation.id)}`}
                      className="grid gap-2 bg-[var(--surface)] p-4 transition-colors hover:bg-[var(--surface-strong)] md:grid-cols-[1fr_auto]"
                    >
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">
                          {conversation.customerName ?? conversation.customerContact ?? "Cliente"} · {conversation.channelType}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                          {conversation.summary ?? "Sin resumen disponible"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        <LabsStatusPill label={conversation.intentLabel ?? conversation.status} tone={conversation.escalatedToHuman ? "warning" : conversationTone(conversation.status)} />
                        <span className="text-xs text-[var(--muted)]">{formatDate(conversation.lastMessageAt)}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </LabsSection>
          </section>

          <LabsSection title="Entrenamiento reciente">
            {dashboard.trainingJobs.length === 0 ? (
              <LabsEmptyState title="Sin entrenamientos" description="Cuando actualices conocimiento vas a ver el progreso aca." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {dashboard.trainingJobs.slice(0, 4).map((job) => (
                  <div key={job.id} className="labs-subpanel p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--foreground)]">{job.summary ?? "Entrenamiento general"}</p>
                      <LabsStatusPill label={job.status} tone={trainingTone(job.status)} />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                      {job.sourceCount} fuentes · {formatDate(job.queuedAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </LabsSection>
        </>
      )}
    </div>
  );
}
