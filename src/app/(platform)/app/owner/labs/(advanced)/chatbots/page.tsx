import { FaqForm } from "@/components/labs/faq-form";
import { KnowledgeFileForm } from "@/components/labs/knowledge-file-form";
import { StatusBadge } from "@/components/business/status-badge";
import { PanelCard } from "@/components/ui/panel-card";
import { getLabsOwnerPageData, trainingTone } from "../_lib/labs-owner";
import { LabsModuleDisabledCard } from "../ui";

export default async function LabsChatbotsPage() {
  const { dashboard, labsEnabled } = await getLabsOwnerPageData();

  return (
    <div className="space-y-8">
      <header className="max-w-4xl">
        <h2 className="text-4xl tracking-[-0.04em] text-[#191c1b]">Chatbots</h2>
        <p className="mt-3 text-lg text-[#4b5b52]">
          Administra FAQs y archivos para entrenar respuestas mas utiles y consistentes.
        </p>
      </header>

      {!labsEnabled ? (
        <LabsModuleDisabledCard />
      ) : (
        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <PanelCard
            eyebrow="Base de conocimiento"
            title="FAQs y contenido estructurado"
            description="Carga respuestas frecuentes y material que ayude al asistente a responder con precision."
          >
            <FaqForm />
            <div className="mt-6 grid gap-3">
              {dashboard.faqs.length === 0 ? (
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
                  Todavia no hay FAQs cargadas.
                </div>
              ) : (
                dashboard.faqs.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--foreground)]">{item.faqQuestion}</p>
                      <StatusBadge tone={trainingTone(item.status)} label={item.status} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.faqAnswer}</p>
                  </div>
                ))
              )}
            </div>
          </PanelCard>

          <PanelCard
            eyebrow="Archivos"
            title="Documentos sobre la empresa"
            description="Sube PDFs o piezas visuales validadas para incorporarlas al entrenamiento."
          >
            <KnowledgeFileForm />
            <div className="mt-6 grid gap-3">
              {dashboard.files.length === 0 ? (
                <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 text-sm leading-7 text-[var(--muted)]">
                  Aun no hay archivos cargados.
                </div>
              ) : (
                dashboard.files.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-strong)_82%,transparent)] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[var(--foreground)]">{item.fileName}</p>
                      <StatusBadge tone={trainingTone(item.status)} label={item.status} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {item.mimeType} {item.fileSizeBytes ? `- ${item.fileSizeBytes} bytes` : ""}
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
