// Ajustes propios de Labs: primero el plan de uso (siempre a la vista), después canales, motor de IA
// y puntaje de interés. Lo usan la pantalla de Ajustes de Labs y la pestaña Labs dentro de app.vase.ar.
import type { LabsChannel } from "@vase/contracts";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PanelFacts, PanelMeter, PanelSection, PanelSections, PanelTag, type PanelTone } from "@vase/ui/panel";
import { getManualChannelCapacity } from "../../../../lib/channel-capacity";
import { listManualChannelStates, listRedactedOfficialChannels } from "../../../../lib/channel-queries";
import { labsPrisma } from "../../../../lib/db";
import { getOpenAiModelProfiles } from "../../../../lib/openai-reply-generator";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { calculateAiBudget, estimateRemainingAiReplies, microsToUsd, type AiBudgetStatus } from "../../../../lib/ai-budget";
import { ChannelCard } from "../channels/channel-card";
import { ChannelConnectModal } from "../channels/channel-connect-modal";
import { MetaOAuthResume } from "../channels/meta-oauth-resume";
import { ModelSelector } from "../chatbots/model-selector";
import { OpenAiKeyCard } from "../chatbots/openai-key-card";
import { ConversationInsightSettingsCard } from "./conversation-insight-settings-card";

const CHANNEL_ORDER: LabsChannel[] = ["WHATSAPP", "INSTAGRAM", "FACEBOOK"];

const BUDGET_STATE: Record<AiBudgetStatus, { label: string; tone: PanelTone }> = {
  NORMAL: { label: "Al día", tone: "g" },
  WARNING: { label: "Queda menos de un tercio", tone: "y" },
  CRITICAL: { label: "Casi sin saldo", tone: "r" },
  EXHAUSTED: { label: "Sin saldo", tone: "r" },
};

/** Datos de Ajustes de Labs. Sin sesión de Labs se manda a ingresar en Vase. */
async function getSettingsData() {
  const requestHeaders = await headers();
  let resolved: Awaited<ReturnType<typeof resolveLabsRequestContext>>;
  try {
    resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("LABS_SESSION")) {
      redirect("https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs%2Fsettings");
    }
    if (error instanceof Error && error.message === "LABS_TENANT_FORBIDDEN") redirect("https://app.vase.ar/app?labs=required");
    redirect("https://app.vase.ar/app");
  }

  const [entitlement, usage, openAiKey, channels, manualChannelStates] = await Promise.all([
    labsPrisma.labsEntitlement.findUnique({ where: { globalTenantId: resolved.context.globalTenantId } }),
    labsPrisma.tokenUsage.aggregate({
      where: { globalTenantId: resolved.context.globalTenantId },
      _sum: { costMicros: true },
      _count: { id: true },
    }),
    labsPrisma.assistantSecret.findUnique({
      where: { assistantId_kind: { assistantId: resolved.assistant.id, kind: "OPENAI_API_KEY" } },
      select: { id: true },
    }),
    listRedactedOfficialChannels(labsPrisma, resolved.assistant.id),
    listManualChannelStates(labsPrisma, resolved.assistant.id),
  ]);

  const channelLimits =
    resolved.context.entitlement.channelLimits ??
    (Object.fromEntries(
      CHANNEL_ORDER.map((channel) => [channel, resolved.context.entitlement.enabledChannels.includes(channel) ? 1 : 0]),
    ) as Record<LabsChannel, number>);

  return {
    plan: entitlement?.plan ?? resolved.context.entitlement.plan,
    tokensUsed: entitlement?.tokensUsed ?? 0,
    aiBudgetMicros: entitlement?.aiBudgetMicros ?? 0,
    aiBudgetUsedMicros: entitlement?.aiBudgetUsedMicros ?? Number(usage._sum.costMicros ?? 0),
    extraAiBudgetMicros: entitlement?.extraAiBudgetMicros ?? 0,
    usageCount: usage._count.id,
    currentModel: resolved.assistant.model,
    openAiKeyConfigured: Boolean(openAiKey),
    channels,
    capacity: getManualChannelCapacity(channelLimits, manualChannelStates, resolved.assistant.id),
  };
}

function formatUsd(micros: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    microsToUsd(micros),
  );
}

/** embed: se ve adentro de app.vase.ar; los links a otras pantallas abren la ventana entera. */
export async function LabsSettingsSections({ attempt, embed = false }: { attempt?: string; embed?: boolean }) {
  const data = await getSettingsData();
  const budget = calculateAiBudget(data);
  const state = BUDGET_STATE[budget.status];
  const estimatedReplies = estimateRemainingAiReplies({ remainingMicros: budget.remainingMicros });
  const connected = data.channels.filter((channel) => channel.status === "CONNECTED").length;

  return (
    <>
      <MetaOAuthResume attemptId={attempt} />

      {/* Lo primero: cuánto usaste y para cuánto te alcanza. Siempre abierto. */}
      <section className="vpa-card" aria-label="Plan de uso">
        <div className="vpa-sech">
          <div className="vpa-g1">
            <h3>Plan de uso · {data.plan}</h3>
            <p>
              Usaste el {budget.usagePercent}% de tu saldo de IA. Te alcanza para unas {estimatedReplies.toLocaleString("es-AR")} respuestas más.
            </p>
          </div>
          <PanelTag tone={state.tone}>{state.label}</PanelTag>
        </div>
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
          <a href="https://app.vase.ar/app/billing" target={embed ? "_top" : undefined} className="vpa-btn line sm">
            Ir a Plan y pagos
          </a>
        </div>
      </section>

      <PanelSections>
        <PanelSection
          id="canales"
          title="Canales"
          summary={connected > 0 ? `${connected} de ${CHANNEL_ORDER.length} conectados` : "Conectá WhatsApp, Instagram o Messenger"}
          badge={<PanelTag tone={connected > 0 ? "g" : "y"}>{connected > 0 ? "Conectado" : "Sin conectar"}</PanelTag>}
        >
          <div className="labs-page-heading-row labs-channels-actions">
            <span>Por dónde te escriben tus clientes.</span>
            <ChannelConnectModal capacity={data.capacity} />
          </div>
          <section className="labs-channel-grid" aria-label="Canales disponibles">
            {CHANNEL_ORDER.map((type) => (
              <ChannelCard key={type} type={type} capacity={data.capacity} channel={data.channels.find((channel) => channel.type === type) ?? null} />
            ))}
          </section>
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
      </PanelSections>
    </>
  );
}
