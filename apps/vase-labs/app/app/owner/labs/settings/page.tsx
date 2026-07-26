import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { LabsPageHeader, LabsSection, LabsStatusPill } from "../labs-ui";
import { ConversationInsightSettingsCard } from "./conversation-insight-settings-card";
import { IntegrationProviderCard } from "./integration-provider-card";
import {
  calculateAiBudget,
  estimateRemainingAiReplies,
  microsToUsd,
} from "../../../../lib/ai-budget";

export const dynamic = "force-dynamic";

async function getSettingsData() {
  const requestHeaders = await headers();

  try {
    const resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
    const entitlement = await labsPrisma.labsEntitlement.findUnique({
      where: { globalTenantId: resolved.context.globalTenantId },
    });
    const usage = await labsPrisma.tokenUsage.aggregate({
      where: { globalTenantId: resolved.context.globalTenantId },
      _sum: { costMicros: true },
      _count: { id: true },
    });

    return {
      tenantName: resolved.context.tenantName,
      plan: entitlement?.plan ?? resolved.context.entitlement.plan,
      status: entitlement?.status ?? resolved.context.entitlement.status,
      enabledChannels: resolved.context.entitlement.enabledChannels,
      tokensIncluded: entitlement?.tokensIncluded ?? 0,
      extraTokens: entitlement?.extraTokens ?? 0,
      tokensUsed: entitlement?.tokensUsed ?? 0,
      aiBudgetMicros: entitlement?.aiBudgetMicros ?? 0,
      aiBudgetUsedMicros: entitlement?.aiBudgetUsedMicros ?? Number(usage._sum.costMicros ?? 0),
      extraAiBudgetMicros: entitlement?.extraAiBudgetMicros ?? 0,
      usageCount: usage._count.id,
      currentModel: resolved.assistant.model,
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
  const availableTokens = Math.max(0, data.tokensIncluded + data.extraTokens - data.tokensUsed);
  const budget = calculateAiBudget(data);
  const statusTone = budget.status === "NORMAL"
    ? "success"
    : budget.status === "WARNING"
      ? "warning"
      : "danger";
  const estimatedReplies = estimateRemainingAiReplies({ remainingMicros: budget.remainingMicros });

  return (
    <div className="space-y-6">
      <LabsPageHeader
        eyebrow="Control operativo"
        title="Ajustes"
        description="Estado del workspace, plan, canales habilitados y capacidad de IA."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LabsSection title="Tenant" description={data.tenantName}>
          <LabsStatusPill label={data.status} tone={data.status === "ACTIVE" ? "success" : "warning"} />
        </LabsSection>
        <LabsSection title="Plan" description={data.plan}>
          <p className="text-sm text-[var(--muted)]">{data.enabledChannels.length} canales habilitados</p>
        </LabsSection>
        <LabsSection title="Tokens disponibles">
          <p className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">{availableTokens.toLocaleString("es-AR")}</p>
        </LabsSection>
        <LabsSection title="Tokens usados">
          <p className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">{data.tokensUsed.toLocaleString("es-AR")}</p>
        </LabsSection>
      </section>

      <LabsSection
        title="Presupuesto IA"
        description="Controla el gasto real estimado de OpenAI por modelo, usando dólares incluidos en el plan."
      >
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-strong)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  {formatUsd(budget.usedMicros)} / {formatUsd(budget.totalMicros)} usado
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Disponible: {formatUsd(budget.remainingMicros)} · {estimatedReplies.toLocaleString("es-AR")} respuestas estimadas
                </p>
              </div>
              <LabsStatusPill label={budget.status} tone={statusTone} />
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[var(--background-elevated)]">
              <div
                className="h-full rounded-full bg-[var(--accent-strong)]"
                style={{ width: `${budget.usagePercent}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs font-semibold text-[var(--muted)]">
              <span>{budget.usagePercent}% consumido</span>
              <span>Plan {data.plan}</span>
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--muted-soft)]">Modelo actual</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">{data.currentModel}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Cada respuesta descuenta costo estimado según input/output tokens del modelo elegido.
            </p>
          </div>
        </div>
      </LabsSection>
      <ConversationInsightSettingsCard />
      <IntegrationProviderCard />
    </div>
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
