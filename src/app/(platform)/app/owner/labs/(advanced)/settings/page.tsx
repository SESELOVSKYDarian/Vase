import { AssistantSettingsForm } from "@/components/labs/assistant-settings-form";
import { PanelCard } from "@/components/ui/panel-card";
import { getLabsPlanLabel } from "@/lib/labs/plans";
import { getLabsOwnerPageData, readBusinessHours } from "../_lib/labs-owner";
import { LabsModuleDisabledCard } from "../ui";

export default async function LabsSettingsPage() {
  const { dashboard, labsEnabled } = await getLabsOwnerPageData();
  const hours = readBusinessHours(dashboard.workspace.businessHours);

  return (
    <div className="space-y-8">
      <header className="max-w-4xl">
        <h2 className="text-4xl tracking-[-0.04em] text-[#191c1b]">Configuracion</h2>
        <p className="mt-3 text-lg text-[#4b5b52]">
          Ajusta personalidad, horarios, escalamiento y limites operativos del asistente.
        </p>
      </header>

      {!labsEnabled ? (
        <LabsModuleDisabledCard />
      ) : (
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <PanelCard
            eyebrow="Configuracion del asistente"
            title="Personalidad, horarios y escalamiento"
            description="Define tono, disponibilidad, reglas de derivacion y la experiencia base del asistente."
          >
            <AssistantSettingsForm
              assistantDisplayName={dashboard.workspace.assistantDisplayName}
              tone={dashboard.workspace.tone}
              timezone={dashboard.workspace.timezone}
              hoursStart={hours.hoursStart}
              hoursEnd={hours.hoursEnd}
              humanEscalationEnabled={dashboard.workspace.humanEscalationEnabled}
              escalationDestination={dashboard.workspace.escalationDestination}
              escalationContact={dashboard.workspace.escalationContact}
              premiumToneEnabled={dashboard.limits.canUsePremiumTone}
            />
          </PanelCard>

          <PanelCard
            eyebrow="Plan y limites"
            title="Capacidad actual de VaseLabs"
            description="Las funciones premium amplian conocimiento, canales, conversaciones y configuracion avanzada."
          >
            <div className="grid gap-3">
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4">
                <p className="font-semibold text-[var(--foreground)]">{getLabsPlanLabel(dashboard.workspace.plan)}</p>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                  Limite mensual de conversaciones: {dashboard.limits.monthlyConversationLimit}
                </p>
              </div>
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                Items de conocimiento: {dashboard.limits.maxKnowledgeItems}
              </div>
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                Archivos: {dashboard.limits.maxFiles}. URLs: {dashboard.limits.maxUrls}
              </div>
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                Canales: {dashboard.limits.maxChannels}. Instagram:{" "}
                {dashboard.limits.canUseInstagram ? "habilitado" : "premium"}
              </div>
              <div className="rounded-3xl bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-4 text-sm leading-7 text-[var(--muted)]">
                Tono premium: {dashboard.limits.canUsePremiumTone ? "si" : "no"}
              </div>
            </div>
          </PanelCard>
        </section>
      )}
    </div>
  );
}
