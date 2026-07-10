import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Bot, Cable, Database, Flame, Gauge, MessageSquare, Route, UserRoundCheck } from "lucide-react";
import { getLabsPlanLimits, type LabsChannel } from "@vase/contracts";
import { labsPrisma } from "../../../lib/db";
import { resolveLabsRequestContext } from "../../../lib/request-context";
import {
  calculateRemainingMessages,
  calculateRemainingTokens,
  canTenantUseChannel,
  createRuntimeEntitlement,
  getAiAvailability,
  type LabsRuntimeStatus,
} from "../../../lib/billing";
import {
  LabsActionLink,
  LabsEmptyState,
  LabsMetricCard,
  LabsPageHeader,
  LabsSection,
  LabsStatusPill,
} from "./labs-ui";

export const dynamic = "force-dynamic";

const channelLabels: Record<LabsChannel, { name: string; tag: string; tone: string; description: string }> = {
  WHATSAPP: {
    name: "WhatsApp",
    tag: "wa",
    tone: "whatsapp",
    description: "Atencion automatizada para consultas comerciales y soporte inicial.",
  },
  INSTAGRAM: {
    name: "Instagram",
    tag: "ig",
    tone: "instagram",
    description: "DMs y consultas sociales con contexto de IA y derivacion humana.",
  },
  FACEBOOK: {
    name: "Facebook",
    tag: "fb",
    tone: "facebook",
    description: "Mensajes de pagina y leads conectados al inbox omnicanal.",
  },
};

const allChannels: LabsChannel[] = ["WHATSAPP", "INSTAGRAM", "FACEBOOK"];

function statusTone(status: string) {
  if (status === "OPEN" || status === "READY" || status === "CONNECTED") return "success";
  if (status === "ESCALATED" || status === "PROCESSING" || status === "QUEUED") return "warning";
  if (status === "ERROR" || status === "FAILED") return "danger";
  return "neutral";
}

function formatDate(input: Date | string | null | undefined) {
  if (!input) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(input));
}

async function getOwnerLabsData() {
  const requestHeaders = await headers();
  let resolved: Awaited<ReturnType<typeof resolveLabsRequestContext>>;

  try {
    resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
  } catch (error) {
    if (error instanceof Error) {
      const authErrors = [
        "LABS_SESSION_REQUIRED",
        "LABS_SESSION_INVALID",
        "LABS_SESSION_EXPIRED",
        "LABS_AUTH_SECRET_MISSING",
      ];
      if (authErrors.includes(error.message)) {
        redirect("https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs");
      }
      if (error.message === "LABS_TENANT_FORBIDDEN") {
        redirect("https://app.vase.ar/app?labs=required");
      }
    }
    redirect("https://app.vase.ar/app");
  }

  const [entitlement, channels, conversations, knowledgeItems, tokenUsage] = await Promise.all([
    labsPrisma.labsEntitlement.findUnique({
      where: { globalTenantId: resolved.context.globalTenantId },
    }),
    labsPrisma.channel.findMany({
      where: { assistantId: resolved.assistant.id },
      orderBy: { updatedAt: "desc" },
    }),
    labsPrisma.conversation.findMany({
      where: { assistantId: resolved.assistant.id },
      orderBy: [{ escalatedToHuman: "desc" }, { lastMessageAt: "desc" }],
      take: 30,
    }),
    labsPrisma.knowledgeItem.findMany({
      where: { assistantId: resolved.assistant.id },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    labsPrisma.tokenUsage.aggregate({
      where: { globalTenantId: resolved.context.globalTenantId },
      _sum: { totalTokens: true },
    }),
  ]);

  const plan = entitlement?.plan ?? resolved.context.entitlement.plan;
  const planLimits = getLabsPlanLimits(plan);
  const tokensUsed = entitlement?.tokensUsed ?? tokenUsage._sum.totalTokens ?? 0;
  const runtimeEntitlement = createRuntimeEntitlement({
    globalTenantId: resolved.context.globalTenantId,
    plan,
    status: (entitlement?.status ?? resolved.context.entitlement.status) as LabsRuntimeStatus,
    enabledChannels: resolved.context.entitlement.enabledChannels,
    tokenPack: entitlement?.tokenPack ?? null,
    tokensIncluded: entitlement?.tokensIncluded ?? planLimits.monthlyTokenLimit,
    tokensUsed,
    extraTokens: entitlement?.extraTokens ?? 0,
    currentPeriodStart: entitlement?.currentPeriodStart?.toISOString() ?? null,
    renewsAt: entitlement?.renewsAt?.toISOString() ?? null,
  });
  const readyKnowledge = knowledgeItems.filter((item) => item.status === "READY").length;
  const connectedChannels = channels.filter((channel) => channel.status === "CONNECTED").length;
  const escalatedConversations = conversations.filter((conversation) => conversation.status === "ESCALATED" || conversation.escalatedToHuman).length;
  const openConversations = conversations.filter((conversation) => conversation.status === "OPEN").length;
  const remainingTokens = calculateRemainingTokens(runtimeEntitlement);
  const remainingMessages = calculateRemainingMessages(runtimeEntitlement);
  const totalTokenBudget = runtimeEntitlement.tokensIncluded + runtimeEntitlement.extraTokens;
  const tokenUsagePercent = totalTokenBudget > 0 ? Math.min(100, Math.round((tokensUsed / totalTokenBudget) * 100)) : 0;

  return {
    tenantName: resolved.context.tenantName,
    plan,
    status: runtimeEntitlement.status,
    aiAvailability: getAiAvailability(runtimeEntitlement),
    remainingMessages,
    remainingTokens,
    tokenUsagePercent,
    tokensUsed,
    channels,
    channelAccess: allChannels.map((channel) => ({
      channel,
      label: channelLabels[channel].name,
      access: canTenantUseChannel(runtimeEntitlement, channel),
    })),
    conversations,
    criticalConversations: conversations
      .filter((conversation) => conversation.intentLabel === "HOT_LEAD" || conversation.escalatedToHuman)
      .slice(0, 5),
    knowledgeItems,
    setupSteps: {
      hasKnowledge: knowledgeItems.length > 0,
      hasChannel: connectedChannels > 0,
      hasEscalation: escalatedConversations > 0 || conversations.length > 0,
    },
    summary: {
      openConversations,
      escalatedConversations,
      hotLeads: conversations.filter((conversation) => conversation.intentLabel === "HOT_LEAD").length,
      connectedChannels,
      knowledgeItems: knowledgeItems.length,
      readyKnowledge,
    },
  };
}

export default async function LabsDashboardPage() {
  const data = await getOwnerLabsData();
  const setupCompleted = data.setupSteps.hasKnowledge && data.setupSteps.hasChannel && data.setupSteps.hasEscalation;

  return (
    <div className="space-y-6">
      <LabsPageHeader
        eyebrow="Operacion IA"
        title="Panel de control"
        description="Estado vivo de conversaciones, conocimiento, canales y capacidad de IA del workspace."
        actions={
          <>
            <LabsActionLink href="/app/owner/labs/inbox">Abrir inbox</LabsActionLink>
            <a href="/app/owner/labs/activity" className="labs-button labs-button-secondary">
              Analisis
            </a>
          </>
        }
      />

      <section className="metric-grid" aria-label="Metricas principales">
        <LabsMetricCard label="Conversaciones abiertas" value={data.summary.openConversations} icon={MessageSquare} tone="info" />
        <LabsMetricCard label="Derivadas a humano" value={data.summary.escalatedConversations} icon={UserRoundCheck} tone="warning" />
        <LabsMetricCard label="Hot leads" value={data.summary.hotLeads} icon={Flame} tone="success" />
        <LabsMetricCard label="Canales conectados" value={data.summary.connectedChannels} icon={Cable} tone="info" />
        <LabsMetricCard label="Conocimiento cargado" value={data.summary.knowledgeItems} icon={Database} tone="neutral" />
        <LabsMetricCard label="Mensajes disponibles" value={data.remainingMessages.toLocaleString("es-AR")} icon={Bot} tone="neutral" />
      </section>

      <section className="content-grid">
        <LabsSection title="Salud del setup" description={`${data.tenantName} · ${data.plan}`}>
          <div className="readiness-list">
            {[
              ["Conocimiento", data.setupSteps.hasKnowledge],
              ["Canales", data.setupSteps.hasChannel],
              ["Escalamiento humano", data.setupSteps.hasEscalation],
            ].map(([label, ok]) => (
              <article key={String(label)}>
                <div>
                  <strong>{label}</strong>
                  <LabsStatusPill label={ok ? "Listo" : "Pendiente"} tone={ok ? "success" : "warning"} />
                </div>
                <p>{ok ? "Configurado para operar." : "Pendiente de configuracion."}</p>
              </article>
            ))}
          </div>
          {!setupCompleted ? (
            <div className="cta-row">
              <a href="/app/owner/labs/settings">
                Completar setup
                <Route className="size-4" />
              </a>
            </div>
          ) : null}
        </LabsSection>

        <LabsSection title="Capacidad IA" eyebrow="Tokens">
          <div className="token-meter" aria-label="Uso de tokens">
            <div>
              <span>Usados</span>
              <strong>{data.tokensUsed.toLocaleString("es-AR")}</strong>
            </div>
            <div>
              <span>Restantes</span>
              <strong>{data.remainingTokens.toLocaleString("es-AR")}</strong>
            </div>
            <span className="meter-track">
              <span style={{ width: `${data.tokenUsagePercent}%` }} />
            </span>
          </div>
          <div className="cta-row">
            <a href="/app/owner/labs/settings">Ajustes de IA</a>
          </div>
        </LabsSection>

        <LabsSection title="Canales conectados" eyebrow="Canales">
          <div className="channel-grid">
            {data.channelAccess.map(({ channel, access }) => {
              const channelMeta = channelLabels[channel];
              const connected = data.channels.some((item) => item.type === channel && item.status === "CONNECTED");

              return (
                <article className={`channel-card ${channelMeta.tone} ${access.allowed ? "" : "is-locked"}`} key={channel}>
                  <div className="channel-topline">
                    <span className="channel-badge" aria-hidden="true">
                      {channelMeta.tag}
                    </span>
                    <LabsStatusPill
                      label={connected ? "Conectado" : access.allowed ? "Incluido" : "Upgrade"}
                      tone={connected || access.allowed ? "success" : "warning"}
                    />
                  </div>
                  <h3>{channelMeta.name}</h3>
                  <p>{channelMeta.description}</p>
                </article>
              );
            })}
          </div>
        </LabsSection>

        <LabsSection title="Conversaciones que piden atencion" eyebrow="Inbox" actions={<a href="/app/owner/labs/activity">Ver todo</a>}>
          {data.criticalConversations.length === 0 ? (
            <LabsEmptyState title="Sin conversaciones criticas" description="Los hot leads y derivaciones humanas apareceran aca." />
          ) : (
            <div className="conversation-list">
              {data.criticalConversations.map((conversation) => (
                <a
                  key={conversation.id}
                  href={`/app/owner/labs/inbox?conversationId=${encodeURIComponent(conversation.id)}`}
                  className="conversation-card"
                >
                  <div>
                    <strong>{conversation.customerName ?? conversation.customerContact ?? "Cliente"}</strong>
                    <span>{conversation.channel ? channelLabels[conversation.channel].name : "Labs"}</span>
                  </div>
                  <p>{conversation.summary ?? "Sin resumen disponible"}</p>
                  <footer>
                    <LabsStatusPill label={conversation.intentLabel ?? conversation.status} tone={conversation.escalatedToHuman ? "warning" : statusTone(conversation.status)} />
                    <small>{formatDate(conversation.lastMessageAt)}</small>
                  </footer>
                </a>
              ))}
            </div>
          )}
        </LabsSection>
      </section>
    </div>
  );
}
