const metrics = [
  { label: "Canales preparados", value: "4", detail: "Webchat, WhatsApp, Instagram y Facebook" },
  { label: "Automatización objetivo", value: "82%", detail: "Respuestas desde Help + training" },
  { label: "Handoffs pendientes", value: "3", detail: "Consultas listas para equipo humano" },
  { label: "Tiempo de primera respuesta", value: "12s", detail: "Meta operacional para canales activos" },
];

const channels = [
  {
    name: "Instagram Business",
    tag: "ig",
    status: "Requiere conexión",
    tone: "instagram",
    description: "DMs, comentarios y consultas comerciales con IA help-first y derivación a humano.",
    readiness: ["OAuth Meta pendiente", "Webhook preparado", "Inbox unificado"],
  },
  {
    name: "Facebook Page",
    tag: "fb",
    status: "Requiere conexión",
    tone: "facebook",
    description: "Mensajes de página, leads y soporte inicial con trazabilidad por tenant.",
    readiness: ["Page token pendiente", "Eventos Messenger", "Handoff a Workplace"],
  },
];

const conversations = [
  {
    customer: "Sofía Alvarez",
    channel: "Instagram",
    message: "Consulta por automatizar respuestas de ecommerce y derivar ventas.",
    state: "Pendiente",
    confidence: "74%",
  },
  {
    customer: "Norte Equipos",
    channel: "Facebook",
    message: "Pide integración con catálogo y seguimiento desde un inbox central.",
    state: "Próximamente",
    confidence: "Meta",
  },
  {
    customer: "Demo Tenant",
    channel: "Webchat",
    message: "La IA encontró respuesta en Help y dejó el resumen listo.",
    state: "Listo",
    confidence: "91%",
  },
];

const readiness = [
  { label: "Help-first retrieval", value: "Listo", detail: "La IA consulta la base oficial antes de responder." },
  { label: "Tokens Meta", value: "Pendiente", detail: "Falta completar OAuth y almacenamiento seguro." },
  { label: "Webhook signature", value: "Pendiente", detail: "Debe validar origen antes de procesar eventos." },
  { label: "Handoff humano", value: "Listo", detail: "Las conversaciones no resueltas quedan listas para tickets." },
];

function StatusPill({ children }: { children: string }) {
  const normalized = children.toLowerCase();

  return <span className={`status-pill ${normalized.includes("listo") ? "is-ready" : "is-pending"}`}>{children}</span>;
}

export default function Page() {
  return (
    <main className="labs-shell">
      <aside className="labs-rail" aria-label="Navegación principal de Vase Labs">
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
          <a href="#channels" aria-current="page">
            Canales
          </a>
          <a href="#inbox">Inbox IA</a>
          <a href="#readiness">Readiness</a>
          <a href="#handoff">Handoff</a>
        </nav>

        <div className="rail-card">
          <p>Estado operativo</p>
          <strong>Meta connectors en preparación</strong>
          <span>La UI ya está lista para conectar OAuth, webhooks y Graph API.</span>
        </div>
      </aside>

      <section className="labs-stage">
        <header className="hero-panel">
          <div className="hero-copy">
            <p className="eyebrow">AI operations center</p>
            <h1>Atención inteligente para canales sociales, sin perder control humano.</h1>
            <p>
              Vase Labs centraliza asistentes, knowledge base, inbox y handoffs. Instagram y Facebook quedan visibles como
              canales preparados, sin prometer conexión real hasta completar la integración Meta.
            </p>
            <div className="hero-actions" aria-label="Acciones principales">
              <button type="button" disabled>
                Preparar conexión Meta
              </button>
              <a href="#readiness">Ver checklist técnico</a>
            </div>
          </div>

          <div className="signal-card" aria-label="Resumen de señal de IA">
            <span className="signal-orbit" aria-hidden="true" />
            <p>IA transversal</p>
            <strong>Help primero, humano cuando importa.</strong>
            <small>Knowledge base, prompts, límites y trazabilidad listos para operar por tenant.</small>
          </div>
        </header>

        <section className="metric-grid" aria-label="Métricas principales">
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
              <p className="eyebrow">Canales sociales</p>
              <h2>Instagram y Facebook con estética propia de Vase.</h2>
            </div>

            <div className="channel-grid">
              {channels.map((channel) => (
                <article className={`channel-card ${channel.tone}`} key={channel.name}>
                  <div className="channel-topline">
                    <span className="channel-badge" aria-hidden="true">
                      {channel.tag}
                    </span>
                    <StatusPill>{channel.status}</StatusPill>
                  </div>
                  <h3>{channel.name}</h3>
                  <p>{channel.description}</p>
                  <ul>
                    {channel.readiness.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <button type="button" disabled>
                    Preparar conexión
                  </button>
                </article>
              ))}
            </div>
          </div>

          <div className="panel inbox-panel" id="inbox">
            <div className="section-heading">
              <p className="eyebrow">Inbox omnicanal</p>
              <h2>Conversaciones con contexto antes de responder.</h2>
            </div>

            <div className="conversation-list">
              {conversations.map((conversation) => (
                <article className="conversation-card" key={conversation.customer}>
                  <div>
                    <strong>{conversation.customer}</strong>
                    <span>{conversation.channel}</span>
                  </div>
                  <p>{conversation.message}</p>
                  <footer>
                    <StatusPill>{conversation.state}</StatusPill>
                    <small>Confianza {conversation.confidence}</small>
                  </footer>
                </article>
              ))}
            </div>
          </div>

          <div className="panel readiness-panel" id="readiness">
            <div className="section-heading">
              <p className="eyebrow">Checklist IA + Meta</p>
              <h2>Lo visual está listo; la conexión real queda marcada.</h2>
            </div>

            <div className="readiness-list">
              {readiness.map((item) => (
                <article key={item.label}>
                  <div>
                    <strong>{item.label}</strong>
                    <StatusPill>{item.value}</StatusPill>
                  </div>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="panel handoff-panel" id="handoff">
            <p className="eyebrow">Handoff</p>
            <h2>Cuando la IA no debe improvisar, escala con elegancia.</h2>
            <p>
              Las conversaciones sin respuesta oficial se empaquetan con resumen, canal, tenant y prioridad para Workplace o
              soporte humano.
            </p>
            <div className="handoff-stack" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
