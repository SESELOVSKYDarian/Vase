import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PanelFacts, PanelMeter, PanelSection, PanelSections, PanelTag, type PanelTone } from "@vase/ui/panel";
import { labsPrisma } from "../../../../lib/db";
import { getOpenAiModelProfiles } from "../../../../lib/openai-reply-generator";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { ModelSelector } from "../chatbots/model-selector";
import { OpenAiKeyCard } from "../chatbots/openai-key-card";
import { ConversationInsightSettingsCard } from "./conversation-insight-settings-card";
import { IntegrationProviderCard } from "./integration-provider-card";
import {
  calculateAiBudget,
  estimateRemainingAiReplies,
  microsToUsd,
  type AiBudgetStatus,
} from "../../../../lib/ai-budget";

export const dynamic = "force-dynamic";

const BUDGET_STATE: Record<AiBudgetStatus, { label: string; tone: PanelTone }> = {
  NORMAL: { label: "Al día", tone: "g" },
  WARNING: { label: "Queda menos de un tercio", tone: "y" },
  CRITICAL: { label: "Casi sin saldo", tone: "r" },
  EXHAUSTED: { label: "Sin saldo", tone: "r" },
};

async function getSettingsData() {
  const requestHeaders = await headers();

  try {
    const resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
    const [entitlement, usage, openAiKey] = await Promise.all([
      labsPrisma.labsEntitlement.findUnique({
        where: { globalTenantId: resolved.context.globalTenantId },
      }),
      labsPrisma.tokenUsage.aggregate({
        where: { globalTenantId: resolved.context.globalTenantId },
        _sum: { costMicros: true },
        _count: { id: true },
      }),
      labsPrisma.assistantSecret.findUnique({
        where: { assistantId_kind: { assistantId: resolved.assistant.id, kind: "OPENAI_API_KEY" } },
        select: { id: true },
      }),
    ]);

    return {
      plan: entitlement?.plan ?? resolved.context.entitlement.plan,
      tokensUsed: entitlement?.tokensUsed ?? 0,
      aiBudgetMicros: entitlement?.aiBudgetMicros ?? 0,
      aiBudgetUsedMicros: entitlement?.aiBudgetUsedMicros ?? Number(usage._sum.costMicros ?? 0),
      extraAiBudgetMicros: entitlement?.extraAiBudgetMicros ?? 0,
      usageCount: usage._count.id,
      currentModel: resolved.assistant.model,
      openAiKeyConfigured: Boolean(openAiKey),
    };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("LABS_SESSION")) {
      redirect("https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs%2Fsettings");
    }
    redirect("https://app.vase.ar/app");
  }
}

export default async function LabsSettingsPage() {
  const data = await getSettingsData();
  const budget = calculateAiBudget(data);
  const state = BUDGET_STATE[budget.status];
  const estimatedReplies = estimateRemainingAiReplies({ remainingMicros: budget.remainingMicros });

  return (
    <PanelSections>
      <PanelSection title="Plan y uso" summary={`Plan ${data.plan} · ${budget.usagePercent}% usado`} badge={<PanelTag tone={state.tone}>{state.label}</PanelTag>} defaultOpen>
        <PanelMeter value={budget.usagePercent} />
        <PanelFacts
          items={[
            { label: "Usado", value: `${formatUsd(budget.usedMicros)} de ${formatUsd(budget.totalMicros)}` },
            { label: "Te queda", value: formatUsd(budget.remainingMicros) },
            { label: "Alcanza para", value: `${estimatedReplies.toLocaleString("es-AR")} respuestas aprox.` },
          ]}
        />
        <div className="vpa-from">
          <span>El plan y los pagos se manejan desde tu cuenta de Vase.</span>
          <a href="https://app.vase.ar/app/billing" className="vpa-btn line sm">Ir a Plan y pagos</a>
        </div>
      </PanelSection>

      <PanelSection title="Motor de IA" summary={`${data.currentModel} · ${data.openAiKeyConfigured ? "con tu clave de OpenAI" : "sin clave de OpenAI"}`}>
        <div className="vpa-stack" style={{ gap: 16 }}>
          <ModelSelector profiles={getOpenAiModelProfiles()} currentModel={data.currentModel} />
          <OpenAiKeyCard configured={data.openAiKeyConfigured} />
        </div>
      </PanelSection>

      <PanelSection title="Puntaje de interés" summary="Cómo decide quién quiere comprar">
        <ConversationInsightSettingsCard />
      </PanelSection>

      <PanelSection title="Dónde se crean los pedidos" summary="Tu tienda de Vase Business u otro sistema">
        <IntegrationProviderCard />
      </PanelSection>
    </PanelSections>
  );
}

function formatUsd(micros: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(microsToUsd(micros));
}
