import { TrainingJobForm } from "@/components/labs/training-job-form";
import { LabsEmptyState, LabsPageHeader, LabsSection, LabsStatusPill } from "@/components/labs/labs-ui";
import { formatDate, getLabsOwnerPageData, trainingTone } from "../_lib/labs-owner";
import { LabsModuleDisabledCard } from "../ui";

export default async function LabsAutomationPage() {
  const { dashboard, labsEnabled } = await getLabsOwnerPageData();

  return (
    <div className="space-y-6">
      <LabsPageHeader
        eyebrow="Entrenamiento"
        title="Automation"
        description="Gestiona la cola de entrenamiento del asistente cuando cambia la base de conocimiento."
      />

      {!labsEnabled ? (
        <LabsModuleDisabledCard />
      ) : (
        <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
          <LabsSection title="Nuevo entrenamiento" description="Encola un entrenamiento cuando actualices documentos, FAQs o URLs.">
            <TrainingJobForm />
          </LabsSection>

          <LabsSection title="Jobs recientes">
            {dashboard.trainingJobs.length === 0 ? (
              <LabsEmptyState title="Sin jobs de entrenamiento" description="La cola aparecera aca cuando solicites un entrenamiento." />
            ) : (
              <div className="grid gap-3">
                {dashboard.trainingJobs.map((job) => (
                  <article key={job.id} className="labs-subpanel p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">{job.summary ?? "Entrenamiento general"}</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                          {job.sourceCount} fuentes · En cola: {formatDate(job.queuedAt)}
                        </p>
                      </div>
                      <LabsStatusPill label={job.status} tone={trainingTone(job.status)} />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </LabsSection>
        </section>
      )}
    </div>
  );
}
