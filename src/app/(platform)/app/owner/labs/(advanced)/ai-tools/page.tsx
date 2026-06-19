import { PanelCard } from "@/components/ui/panel-card";
import { OpenAiSettingsForm } from "@/components/labs/openai-settings-form";
import { readOpenAiBusinessConfig } from "@/lib/labs/openai-config";
import { getLabsOwnerPageData } from "../_lib/labs-owner";
import { LabsModuleDisabledCard } from "../ui";

export default async function LabsAiToolsPage() {
  const { dashboard, labsEnabled } = await getLabsOwnerPageData();
  const openAiConfig = readOpenAiBusinessConfig(
    dashboard.workspace.businessContext,
    dashboard.workspace.modelSlug ?? undefined,
  );
  const temperature = dashboard.workspace.temperature == null
    ? 0.4
    : Number(dashboard.workspace.temperature);

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
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <PanelCard
            eyebrow="ChatGPT / OpenAI"
            title="Conexion del modelo conversacional"
            description="Activa Responses API para que el asistente responda con un modelo tipo ChatGPT usando el conocimiento y el historial del cliente."
          >
            <OpenAiSettingsForm
              enabled={openAiConfig.enabled}
              model={openAiConfig.model}
              hasApiKey={openAiConfig.hasApiKey}
              temperature={temperature}
              systemPrompt={dashboard.workspace.systemPrompt}
            />
          </PanelCard>

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
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-5 md:col-span-2">
                <p className="text-sm text-[var(--muted)]">Proveedor IA</p>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                  {openAiConfig.enabled ? `OpenAI - ${openAiConfig.model}` : "Motor local"}
                </p>
                <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
                  API key: {openAiConfig.hasApiKey ? "guardada" : "pendiente"}
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
