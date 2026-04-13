import { TrainingJobForm } from "@/components/labs/training-job-form";
import { StatusBadge } from "@/components/business/status-badge";
import { PanelCard } from "@/components/ui/panel-card";
import { conversationTone, formatDate, getLabsOwnerPageData, trainingTone } from "../_lib/labs-owner";
import { LabsModuleDisabledCard } from "../ui";

export default async function LabsAutomationPage() {
  const { dashboard, labsEnabled } = await getLabsOwnerPageData();

  return (
    <div className="space-y-8">
      <header className="max-w-4xl">
        <h2 className="text-4xl tracking-[-0.04em] text-[#191c1b]">Automatizacion</h2>
        <p className="mt-3 text-lg text-[#4b5b52]">
          Gestiona entrenamientos y revisa conversaciones recientes para medir respuesta operativa.
        </p>
      </header>

      {!labsEnabled ? (
        <LabsModuleDisabledCard />
      ) : (
        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <PanelCard
            eyebrow="Entrenamiento"
            title="Estado de entrenamiento"
            description="Cada cambio importante puede entrar a una cola de entrenamiento para preparar el asistente."
          >
            <TrainingJobForm />
            <div className="mt-6 grid gap-3">
              {dashboard.trainingJobs.length === 0 ? (
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
                  Aun no hay jobs de entrenamiento.
                </div>
              ) : (
                dashboard.trainingJobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--foreground)]">{job.summary ?? "Entrenamiento general"}</p>
                      <StatusBadge tone={trainingTone(job.status)} label={job.status} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      Fuentes: {job.sourceCount}. En cola: {formatDate(job.queuedAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </PanelCard>

          <PanelCard
            eyebrow="Historial de conversaciones"
            title="Actividad reciente del asistente"
            description="Control simple sobre conversaciones abiertas, escaladas y cerradas."
          >
            <div className="grid gap-3">
              {dashboard.conversations.length === 0 ? (
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
                  Aun no hay conversaciones registradas.
                </div>
              ) : (
                dashboard.conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--foreground)]">
                        {conversation.customerName ?? "Cliente sin nombre"} - {conversation.channelType}
                      </p>
                      <StatusBadge tone={conversationTone(conversation.status)} label={conversation.status} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{conversation.summary ?? "Sin resumen disponible"}.</p>
                    <p className="mt-2 text-xs text-[var(--muted-soft)]">
                      Ultimo mensaje: {formatDate(conversation.lastMessageAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </PanelCard>
        </section>
      )}
    </div>
  );
}
