import { LabsPageHeader } from "@/components/labs/labs-ui";
import { SettingsWorkbench } from "@/components/labs/settings-workbench";
import { readOpenAiBusinessConfig } from "@/lib/labs/openai-config";
import { getLabsOwnerPageData, readBusinessHours } from "../_lib/labs-owner";
import { LabsModuleDisabledCard } from "../ui";

export default async function LabsSettingsPage() {
  const { dashboard, labsEnabled } = await getLabsOwnerPageData();
  const hours = readBusinessHours(dashboard.workspace.businessHours);
  const openAiConfig = readOpenAiBusinessConfig(
    dashboard.workspace.businessContext,
    dashboard.workspace.modelSlug ?? undefined,
  );
  const temperature = dashboard.workspace.temperature == null ? 0.4 : Number(dashboard.workspace.temperature);

  return (
    <div className="space-y-6">
      <LabsPageHeader
        eyebrow="Control operativo"
        title="Ajustes"
        description="Configura personalidad, modelo IA, escalamiento humano y capacidad del workspace."
      />

      {!labsEnabled ? (
        <LabsModuleDisabledCard />
      ) : (
        <SettingsWorkbench
          assistantDisplayName={dashboard.workspace.assistantDisplayName}
          tone={dashboard.workspace.tone}
          timezone={dashboard.workspace.timezone}
          hoursStart={hours.hoursStart}
          hoursEnd={hours.hoursEnd}
          humanEscalationEnabled={dashboard.workspace.humanEscalationEnabled}
          escalationDestination={dashboard.workspace.escalationDestination}
          escalationContact={dashboard.workspace.escalationContact}
          premiumToneEnabled={dashboard.limits.canUsePremiumTone}
          openAiEnabled={openAiConfig.enabled}
          openAiModel={openAiConfig.model}
          hasApiKey={openAiConfig.hasApiKey}
          temperature={temperature}
          systemPrompt={dashboard.workspace.systemPrompt}
          plan={dashboard.workspace.plan}
          limits={dashboard.limits}
        />
      )}
    </div>
  );
}
