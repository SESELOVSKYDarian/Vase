import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
import { LabsStatusPill } from "./labs-ui";

export const dynamic = "force-dynamic";

const planChannels: Record<string, LabsChannel[]> = {
  STARTER: ["WHATSAPP"],
  GROWTH: ["WHATSAPP", "INSTAGRAM"],
  PRO: ["WHATSAPP", "INSTAGRAM", "FACEBOOK"],
};

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

  const openConversations = conversations.filter((c) => c.status === "OPEN").length;
  const escalatedConversations = conversations.filter(
    (c) => c.status === "ESCALATED" || c.escalatedToHuman,
  ).length;
  const connectedChannels = channels.filter((c) => c.status === "CONNECTED").length;
  const readyKnowledge = knowledgeItems.filter((item) => item.status === "READY").length;
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
  const aiAvailability = getAiAvailability(runtimeEntitlement);
  const remainingTokens = calculateRemainingTokens(runtimeEntitlement);
  const remainingMessages = calculateRemainingMessages(runtimeEntitlement);
  const totalTokenBudget = runtimeEntitlement.tokensIncluded + runtimeEntitlement.extraTokens;
  const tokenUsagePercent = totalTokenBudget > 0 ? Math.min(100, Math.round((tokensUsed / totalTokenBudget) * 100)) : 0;

  const criticalConversations = conversations
    .filter((c) => c.intentLabel === "HOT_LEAD" || c.escalatedToHuman)
    .slice(0, 5);

  const setupSteps = {
    hasKnowledge: knowledgeItems.length > 0,
    hasChannel: connectedChannels > 0,
    hasEscalation: escalatedConversations > 0 || conversations.length > 0,
  };

  return {
    plan,
    status: runtimeEntitlement.status,
    enabledChannels: runtimeEntitlement.enabledChannels,
    tokensIncluded: runtimeEntitlement.tokensIncluded,
    tokensUsed,
    extraTokens: runtimeEntitlement.extraTokens,
    remainingTokens,
    remainingMessages,
    tokenUsagePercent,
    aiAvailability,
    channelAccess: allChannels.map((channel) => ({
      channel,
      label: channelLabels[channel].name,
      access: canTenantUseChannel(runtimeEntitlement, channel),
    })),
    openConversations,
    escalatedConversations,
    connectedChannels,
    knowledgeItemCount: knowledgeItems.length,
    readyKnowledge,
    conversations,
    knowledgeItems,
    criticalConversations,
    setupSteps,
  };
}

export default async function LabsDashboardPage() {
  const data = await getOwnerLabsData();
  const planCards = (["STARTER", "GROWTH", "PRO"] as const).map((plan) => ({
    plan,
    title: plan.charAt(0) + plan.slice(1).toLowerCase(),
    tokens: getLabsPlanLimits(plan).monthlyTokenLimit.toLocaleString("es-AR"),
    cta: plan === data.plan ? "Plan actual" : plan === "PRO" ? "Subir a Pro" : "Plan inicial",
  }));
  const visibleConversations = data.conversations.slice(0, 5);

  return (
    <>
      <header className="hero-panel" id="plan">
        <div className="hero-copy">
          <p className="eyebrow">Plan y consumo</p>
          <h1>Tu acceso a Labs, canales y tokens en una sola vista.</h1>
          <p>
            El tenant esta en {data.plan}: los canales habilitados, el saldo de tokens y el estado de IA quedan
            visibles sin salir del panel operativo.
          </p>
          <div className="hero-actions" aria-label="Acciones principales">
            <a href="/app/owner/labs/settings">Comprar tokens</a>
            <a href="/app/owner/labs/integrations">Gestionar canales</a>
          </div>
        </div>

        <div className="signal-card" aria-label="Resumen del plan actual">
          <span className="signal-orbit" aria-hidden="true" />
          <p>Plan actual</p>
          <strong>{data.plan}</strong>
          <small>
            {data.enabledChannels.map((channel) => channelLabels[channel].name).join(", ") || "Sin canales"}.
            {" "}{data.remainingTokens.toLocaleString("es-AR")} tokens disponibles.
          </small>
        </div>
      </header>

      <section className="metric-grid" aria-label="Metricas principales">
        {[
          { label: "Plan actual", value: data.plan, detail: `${data.enabledChannels.length} canales habilitados` },
          { label: "Tokens restantes", value: data.remainingTokens.toLocaleString("es-AR"), detail: `${data.tokenUsagePercent}% usado del saldo total` },
          { label: "Mensajes estimados", value: data.remainingMessages.toLocaleString("es-AR"), detail: "Estimacion basada en 500 tokens por mensaje" },
          { label: "IA", value: data.aiAvailability.aiEnabled ? "Activa" : "Pausada", detail: data.aiAvailability.reason },
        ].map((metric) => (
          <article className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.detail}</p>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <div className="panel channels-panel" id="channels">
          <div className="section-heading">
            <p className="eyebrow">Canales por plan</p>
            <h2>Solo se muestran activos los canales incluidos.</h2>
          </div>

          <div className="channel-grid">
            {data.channelAccess.map(({ channel, access }) => {
              const channelMeta = channelLabels[channel];

              return (
                <article className={`channel-card ${channelMeta.tone} ${access.allowed ? "" : "is-locked"}`} key={channel}>
                  <div className="channel-topline">
                    <span className="channel-badge" aria-hidden="true">
                      {channelMeta.tag}
                    </span>
                    <LabsStatusPill label={access.allowed ? "Incluido" : "Upgrade"} tone={access.allowed ? "success" : "warning"} />
                  </div>
                  <h3>{channelMeta.name}</h3>
                  <p>{channelMeta.description}</p>
                  <ul>
                    <li>{access.allowed ? `Disponible en ${data.plan}` : "Disponible por upgrade"}</li>
                    <li>{access.allowed ? "Puede recibir IA" : "No se marca como activo"}</li>
                    <li>{access.humanInterventionAllowed ? "Handoff humano disponible" : "Revisar permisos"}</li>
                  </ul>
                  <button type="button" disabled>
                    {access.allowed ? "Canal incluido" : "Requiere upgrade"}
                  </button>
                </article>
              );
            })}
          </div>
        </div>

        <div className="panel tokens-panel" id="tokens">
          <div className="section-heading">
            <p className="eyebrow">Tokens</p>
            <h2>Saldo claro antes de automatizar.</h2>
          </div>

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

          <div className="token-breakdown">
            <p>
              <strong>{data.tokensIncluded.toLocaleString("es-AR")}</strong>
              Tokens incluidos
            </p>
            <p>
              <strong>{data.extraTokens.toLocaleString("es-AR")}</strong>
              Tokens extra
            </p>
            <p>
              <strong>{data.remainingMessages.toLocaleString("es-AR")}</strong>
              Mensajes estimados
            </p>
          </div>
        </div>

        <div className="panel plans-panel" id="plans">
          <div className="section-heading">
            <p className="eyebrow">Planes Labs</p>
            <h2>Upgrade cuando el canal lo justifica.</h2>
          </div>

          <div className="plans-grid">
            {planCards.map((plan) => (
              <article className={`plan-card ${plan.plan === data.plan ? "is-current" : ""}`} key={plan.plan}>
                <div>
                  <strong>{plan.title}</strong>
                  <LabsStatusPill label={plan.cta} tone={plan.plan === data.plan ? "success" : "warning"} />
                </div>
                <p>{plan.tokens} tokens mensuales</p>
                <ul>
                  {allChannels.map((channel) => (
                    <li className={(planChannels[plan.plan] ?? []).includes(channel) ? "is-included" : ""} key={channel}>
                      {channelLabels[channel].name}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>

        <div className="panel inbox-panel" id="inbox">
          <div className="section-heading">
            <p className="eyebrow">Inbox cliente</p>
            <h2>Vista adaptada al plan actual.</h2>
          </div>

          <div className="inbox-channel-strip" aria-label="Canales visibles en el inbox">
            {data.channelAccess.map(({ channel, access }) => (
              <span className={access.allowed ? "is-active" : ""} key={channel}>
                {channelLabels[channel].name}
                {!access.allowed ? " upgrade" : ""}
              </span>
            ))}
          </div>

          <div className="conversation-list">
            {visibleConversations.length === 0 ? (
              <article className="conversation-card is-locked">
                <div>
                  <strong>Sin conversaciones recientes</strong>
                  <span>Labs</span>
                </div>
                <p>Las conversaciones del inbox apareceran aca cuando ingresen mensajes por los canales conectados.</p>
                <footer>
                  <LabsStatusPill label="Pendiente" tone="warning" />
                  <small>Esperando actividad</small>
                </footer>
              </article>
            ) : (
              visibleConversations.map((conversation) => (
                <article className="conversation-card" key={conversation.id}>
                  <div>
                    <strong>{conversation.customerName ?? conversation.customerContact ?? "Cliente"}</strong>
                    <span>{conversation.channel ? channelLabels[conversation.channel].name : "Labs"}</span>
                  </div>
                  <p>{conversation.summary ?? "Sin resumen disponible"}</p>
                  <footer>
                    <LabsStatusPill label={conversation.escalatedToHuman ? "Escalado" : conversation.status} tone={conversation.escalatedToHuman ? "warning" : "success"} />
                    <small>{conversation.intentLabel ?? "Sin intencion"}</small>
                  </footer>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
}
