import type { LabsChannel, LabsPlan } from "@vase/contracts";
import {
  calculateRemainingMessages,
  calculateRemainingTokens,
  canTenantUseChannel,
  createRuntimeEntitlement,
  getAiAvailability,
} from "./lib/billing";

const planChannels: Record<LabsPlan, LabsChannel[]> = {
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

const currentEntitlement = createRuntimeEntitlement({
  globalTenantId: "tenant_demo",
  plan: "GROWTH",
  status: "ACTIVE",
  enabledChannels: planChannels.GROWTH,
  tokenPack: "BASIC",
  tokensIncluded: 250000,
  tokensUsed: 82000,
  extraTokens: 100000,
  currentPeriodStart: "2026-06-24T00:00:00.000Z",
  renewsAt: "2026-07-24T00:00:00.000Z",
});

const allChannels: LabsChannel[] = ["WHATSAPP", "INSTAGRAM", "FACEBOOK"];
const remainingTokens = calculateRemainingTokens(currentEntitlement);
const remainingMessages = calculateRemainingMessages(currentEntitlement);
const aiAvailability = getAiAvailability(currentEntitlement, new Date("2026-06-24T12:00:00.000Z"));
const tokenUsagePercent = Math.min(
  100,
  Math.round((currentEntitlement.tokensUsed / (currentEntitlement.tokensIncluded + currentEntitlement.extraTokens)) * 100),
);

const metrics = [
  { label: "Plan actual", value: "Growth", detail: "WhatsApp + Instagram incluidos" },
  { label: "Tokens restantes", value: remainingTokens.toLocaleString("es-AR"), detail: `${tokenUsagePercent}% usado del saldo total` },
  { label: "Mensajes estimados", value: remainingMessages.toLocaleString("es-AR"), detail: "Estimacion basada en 500 tokens por mensaje" },
  { label: "Proxima renovacion", value: "24 Jul", detail: "Renovacion del periodo actual" },
];

const planCards = [
  {
    plan: "STARTER" as const,
    title: "Starter",
    tokens: "50.000",
    cta: "Plan inicial",
  },
  {
    plan: "GROWTH" as const,
    title: "Growth",
    tokens: "250.000",
    cta: "Plan actual",
  },
  {
    plan: "PRO" as const,
    title: "Pro",
    tokens: "1.000.000",
    cta: "Subir a Pro",
  },
];

type InboxConversation = {
  customer: string;
  channel: LabsChannel;
  message: string;
  state: string;
  confidence: string;
};

const conversationsByChannel: Record<LabsChannel, InboxConversation[]> = {
  WHATSAPP: [{
    customer: "Norte Equipos",
    channel: "WHATSAPP",
    message: "Consulta por automatizar respuestas frecuentes y derivar ventas al equipo.",
    state: "Listo",
    confidence: "91%",
  }],
  INSTAGRAM: [{
    customer: "Sofia Alvarez",
    channel: "INSTAGRAM",
    message: "Pregunta por entrenamiento de IA con documentacion y catalogo.",
    state: "Listo",
    confidence: "84%",
  }],
  FACEBOOK: [{
    customer: "Facebook Leads",
    channel: "FACEBOOK",
    message: "Mensajes de pagina y leads quedaran disponibles al subir a Pro.",
    state: "Upgrade",
    confidence: "Bloqueado",
  }],
};

function getInboxItems() {
  return allChannels.flatMap((channel) => {
    const access = canTenantUseChannel(currentEntitlement, channel, new Date("2026-06-24T12:00:00.000Z"));

    if (access.allowed) {
      return conversationsByChannel[channel].map((conversation) => ({ conversation, locked: false }));
    }

    return conversationsByChannel[channel].map((conversation) => ({ conversation, locked: true }));
  });
}

function StatusPill({ children }: { children: string }) {
  const normalized = children.toLowerCase();
  const state = normalized.includes("listo") || normalized.includes("actual") ? "is-ready" : "is-pending";

  return <span className={`status-pill ${state}`}>{children}</span>;
}

export default function Page() {
  return (
    <main className="labs-shell">
      <aside className="labs-rail" aria-label="Navegacion principal de Vase Labs">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            VL
          </span>
          <div>
            <p className="eyebrow">Vase Platform</p>
            <strong>Labs</strong>
          </div>
        </div>

        <nav className="rail-nav" aria-label="Secciones de Labs">
          <a href="#plan" aria-current="page">
            Plan
          </a>
          <a href="#channels">Canales</a>
          <a href="#tokens">Tokens</a>
          <a href="#inbox">Inbox IA</a>
        </nav>

        <div className="rail-card">
          <p>Estado del servicio</p>
          <strong>{aiAvailability.aiEnabled ? "IA activa" : "IA pausada"}</strong>
          <span>
            {aiAvailability.humanInterventionAllowed
              ? "La intervencion humana sigue disponible ante limites o upgrades."
              : "Revisar estado operativo."}
          </span>
        </div>
      </aside>

      <section className="labs-stage">
        <header className="hero-panel" id="plan">
          <div className="hero-copy">
            <p className="eyebrow">Plan y consumo</p>
            <h1>Tu acceso a Labs, canales y tokens en una sola vista.</h1>
            <p>
              El tenant esta en Growth: WhatsApp e Instagram estan incluidos, Facebook queda bloqueado hasta subir a Pro.
              Los tokens muestran saldo disponible, consumo actual y proxima renovacion.
            </p>
            <div className="hero-actions" aria-label="Acciones principales">
              <a href="#tokens">Comprar tokens</a>
              <a href="#plans">Subir de plan</a>
            </div>
          </div>

          <div className="signal-card" aria-label="Resumen del plan actual">
            <span className="signal-orbit" aria-hidden="true" />
            <p>Plan actual</p>
            <strong>Growth</strong>
            <small>Incluye WhatsApp, Instagram, 250.000 tokens mensuales y pack Basic activo.</small>
          </div>
        </header>

        <section className="metric-grid" aria-label="Metricas principales">
          {metrics.map((metric) => (
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
              {allChannels.map((channel) => {
                const access = canTenantUseChannel(currentEntitlement, channel, new Date("2026-06-24T12:00:00.000Z"));
                const channelMeta = channelLabels[channel];

                return (
                  <article className={`channel-card ${channelMeta.tone} ${access.allowed ? "" : "is-locked"}`} key={channel}>
                    <div className="channel-topline">
                      <span className="channel-badge" aria-hidden="true">
                        {channelMeta.tag}
                      </span>
                      <StatusPill>{access.allowed ? "Incluido" : "Upgrade"}</StatusPill>
                    </div>
                    <h3>{channelMeta.name}</h3>
                    <p>{channelMeta.description}</p>
                    <ul>
                      <li>{access.allowed ? "Disponible en Growth" : "Disponible en Pro"}</li>
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
                <strong>{currentEntitlement.tokensUsed.toLocaleString("es-AR")}</strong>
              </div>
              <div>
                <span>Restantes</span>
                <strong>{remainingTokens.toLocaleString("es-AR")}</strong>
              </div>
              <span className="meter-track">
                <span style={{ width: `${tokenUsagePercent}%` }} />
              </span>
            </div>

            <div className="token-breakdown">
              <p>
                <strong>{currentEntitlement.tokensIncluded.toLocaleString("es-AR")}</strong>
                Tokens incluidos
              </p>
              <p>
                <strong>{currentEntitlement.extraTokens.toLocaleString("es-AR")}</strong>
                Tokens extra
              </p>
              <p>
                <strong>{remainingMessages.toLocaleString("es-AR")}</strong>
                Mensajes estimados
              </p>
            </div>

            <div className="cta-row">
              <a href="#tokens">Comprar pack</a>
              <a href="#plans">Comparar planes</a>
            </div>
          </div>

          <div className="panel plans-panel" id="plans">
            <div className="section-heading">
              <p className="eyebrow">Planes Labs</p>
              <h2>Upgrade cuando el canal lo justifica.</h2>
            </div>

            <div className="plans-grid">
              {planCards.map((plan) => (
                <article className={`plan-card ${plan.plan === currentEntitlement.plan ? "is-current" : ""}`} key={plan.plan}>
                  <div>
                    <strong>{plan.title}</strong>
                    <StatusPill>{plan.cta}</StatusPill>
                  </div>
                  <p>{plan.tokens} tokens mensuales</p>
                  <ul>
                    {allChannels.map((channel) => (
                      <li className={planChannels[plan.plan].includes(channel) ? "is-included" : ""} key={channel}>
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
              {allChannels.map((channel) => {
                const access = canTenantUseChannel(currentEntitlement, channel, new Date("2026-06-24T12:00:00.000Z"));
                const channelMeta = channelLabels[channel];

                return (
                  <span className={access.allowed ? "is-active" : ""} key={channel}>
                    {channelMeta.name}
                    {!access.allowed ? " upgrade" : ""}
                  </span>
                );
              })}
            </div>

            <div className="conversation-list">
              {getInboxItems().map(({ conversation, locked }) => (
                <article className={`conversation-card ${locked ? "is-locked" : ""}`} key={conversation.customer}>
                  <div>
                    <strong>{conversation.customer}</strong>
                    <span>{channelLabels[conversation.channel].name}</span>
                  </div>
                  <p>{conversation.message}</p>
                  <footer>
                    <StatusPill>{locked ? "Upgrade" : conversation.state}</StatusPill>
                    <small>{locked ? "Canal bloqueado por plan" : conversation.confidence}</small>
                  </footer>
                </article>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
