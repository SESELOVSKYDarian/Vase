import { PanelCard } from "@/components/ui/panel-card";
import { getLabsOwnerPageData } from "../_lib/labs-owner";
import { LabsModuleDisabledCard } from "../ui";

export default async function LabsAiToolsPage() {
  const { dashboard, labsEnabled } = await getLabsOwnerPageData();

  return (
    <div className="space-y-8">
      <header className="max-w-4xl">
        <h2 className="text-4xl tracking-[-0.04em] text-[#191c1b]">Herramientas IA</h2>
        <p className="mt-3 text-lg text-[#4b5b52]">
          Indicadores del asistente, cobertura y reglas para escalamiento humano.
        </p>
      </header>

      {!labsEnabled ? (
        <LabsModuleDisabledCard />
      ) : (
        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <PanelCard
            eyebrow="Metricas"
            title="Indicadores del asistente"
            description="Lectura simple para negocio sobre adopcion, derivaciones y capacidad actual."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
                <p className="text-sm text-[var(--muted)]">Conversaciones del plan</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                  {dashboard.summary.monthlyConversationLimit}
                </p>
              </div>
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5">
                <p className="text-sm text-[var(--muted)]">Escaladas a humano</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
                  {dashboard.summary.escalatedConversations}
                </p>
              </div>
            </div>
          </PanelCard>

          <PanelCard
            eyebrow="Escalamiento a humano"
            title="Cobertura operativa"
            description="La IA puede derivar a una persona cuando el caso excede reglas, horario o confianza."
          >
            <div className="grid gap-3">
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                Habilitado: {dashboard.workspace.humanEscalationEnabled ? "si" : "no"}
              </div>
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                Destino: {dashboard.workspace.escalationDestination}
              </div>
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                Contacto: {dashboard.workspace.escalationContact ?? "No configurado"}
              </div>
            </div>
          </PanelCard>
        </section>
      )}
    </div>
  );
}
