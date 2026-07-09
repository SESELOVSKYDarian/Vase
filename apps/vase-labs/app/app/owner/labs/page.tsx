import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { labsPrisma } from "../../../lib/db";
import { resolveLabsRequestContext } from "../../../lib/request-context";

export const dynamic = "force-dynamic";

type OwnerLabsData = {
  tenantName: string;
  plan: string;
  serviceStatus: string;
  openConversations: number;
  escalatedConversations: number;
  connectedChannels: number;
  knowledgeItems: number;
  trainingItems: number;
  tokensUsed: number;
  tokensAvailable: number;
  setup: Array<{ label: string; ready: boolean }>;
  criticalConversations: Array<{
    id: string;
    customer: string;
    channel: string;
    summary: string;
    status: string;
    lastMessageAt: Date | null;
    escalatedToHuman: boolean;
  }>;
  recentTraining: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: Date;
  }>;
};

function formatDate(value: Date | null) {
  if (!value) return "Sin actividad";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function statusTone(value: string, escalated = false) {
  const normalized = value.toLowerCase();
  if (escalated || normalized.includes("pending") || normalized.includes("open")) return "warning";
  if (normalized.includes("ready") || normalized.includes("connected") || normalized.includes("closed")) return "success";
  return "neutral";
}

function StatusPill({ label, tone = "neutral" }: { label: string; tone?: "success" | "warning" | "neutral" }) {
  return <span className={`owner-labs-pill is-${tone}`}>{label}</span>;
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <article className="owner-labs-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <p>{detail}</p> : null}
    </article>
  );
}

async function getOwnerLabsData(): Promise<OwnerLabsData> {
  const requestHeaders = await headers();
  let resolved: Awaited<ReturnType<typeof resolveLabsRequestContext>>;

  try {
    resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
  } catch {
    redirect("https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs");
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
      take: 8,
    }),
    labsPrisma.knowledgeItem.findMany({
      where: { assistantId: resolved.assistant.id },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
    labsPrisma.tokenUsage.aggregate({
      where: { globalTenantId: resolved.context.globalTenantId },
      _sum: { totalTokens: true },
    }),
  ]);

  const openConversations = conversations.filter((conversation) => conversation.status === "OPEN").length;
  const escalatedConversations = conversations.filter(
    (conversation) => conversation.status === "ESCALATED" || conversation.escalatedToHuman,
  ).length;
  const connectedChannels = channels.filter((channel) => channel.status === "CONNECTED").length;
  const tokensUsed = entitlement?.tokensUsed ?? tokenUsage._sum.totalTokens ?? 0;
  const tokensAvailable = Math.max(
    0,
    (entitlement?.tokensIncluded ?? 0) + (entitlement?.extraTokens ?? 0) - tokensUsed,
  );

  return {
    tenantName: resolved.context.tenantName,
    plan: entitlement?.plan ?? resolved.context.entitlement.plan,
    serviceStatus: entitlement?.status ?? "ACTIVE",
    openConversations,
    escalatedConversations,
    connectedChannels,
    knowledgeItems: knowledgeItems.length,
    trainingItems: knowledgeItems.filter((item) => item.status === "READY").length,
    tokensUsed,
    tokensAvailable,
    setup: [
      { label: "Conocimiento", ready: knowledgeItems.length > 0 },
      { label: "Canales", ready: connectedChannels > 0 },
      { label: "Escalamiento humano", ready: escalatedConversations > 0 || conversations.length > 0 },
    ],
    criticalConversations: conversations.slice(0, 5).map((conversation) => ({
      id: conversation.id,
      customer: conversation.customerName ?? conversation.customerContact ?? "Cliente",
      channel: conversation.channel ?? "LABS",
      summary: conversation.summary ?? "Conversacion lista para seguimiento.",
      status: conversation.status,
      lastMessageAt: conversation.lastMessageAt,
      escalatedToHuman: conversation.escalatedToHuman,
    })),
    recentTraining: knowledgeItems.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      createdAt: item.createdAt,
    })),
  };
}

export default async function LabsOwnerDashboardPage() {
  const data = await getOwnerLabsData();
  const setupCompleted = data.setup.every((item) => item.ready);

  return (
    <main className="owner-labs-shell">
      <aside className="owner-labs-sidebar" aria-label="Navegacion Vase Labs">
        <a href="/app/owner/labs" className="owner-labs-brand" aria-label="Volver al panel de Vase Labs">
          <span>VL</span>
          <div>
            <strong>Vase Labs</strong>
            <small>Centro IA</small>
          </div>
        </a>

        <nav className="owner-labs-nav" aria-label="Secciones de Labs">
          <a href="/app/owner/labs" aria-current="page">Panel</a>
          <a href="#inbox">Inbox</a>
          <a href="#actividad">Actividad</a>
          <a href="#conocimiento">Conocimiento</a>
          <a href="#canales">Canales</a>
          <a href="#ajustes">Ajustes</a>
        </nav>

        <div className="owner-labs-tenant-card">
          <span>{data.tenantName.slice(0, 2).toUpperCase()}</span>
          <div>
            <strong>{data.tenantName}</strong>
            <small>{data.plan} - {data.serviceStatus}</small>
          </div>
        </div>
      </aside>

      <section className="owner-labs-main">
        <header className="owner-labs-header">
          <div>
            <p>Operacion IA</p>
            <h1>Panel de control</h1>
            <span>Estado vivo de conversaciones, conocimiento, canales y derivaciones humanas.</span>
          </div>
          <div className="owner-labs-actions">
            <a href="#inbox">Abrir inbox</a>
            <a href="#actividad">Analisis</a>
          </div>
        </header>

        <section className="owner-labs-metrics" aria-label="Metricas principales">
          <MetricCard label="Conversaciones abiertas" value={data.openConversations} detail="Seguimiento activo" />
          <MetricCard label="Derivadas a humano" value={data.escalatedConversations} detail="Handoffs pendientes o recientes" />
          <MetricCard label="Hot leads" value={data.criticalConversations.length} detail="Conversaciones priorizadas" />
          <MetricCard label="Canales conectados" value={data.connectedChannels} detail="WhatsApp, Instagram o Facebook" />
          <MetricCard label="Conocimiento cargado" value={data.knowledgeItems} detail="Fuentes disponibles" />
          <MetricCard label="Training" value={`${data.trainingItems}/${data.knowledgeItems}`} detail="Fuentes listas" />
        </section>

        <section className="owner-labs-grid">
          <article className="owner-labs-panel owner-labs-chart-panel" id="actividad">
            <div className="owner-labs-panel-heading">
              <div>
                <p>Ritmo de conversaciones</p>
                <h2>Actividad reciente del asistente</h2>
              </div>
              <StatusPill label={data.serviceStatus} tone="success" />
            </div>
            <div className="owner-labs-bars" aria-label="Resumen visual de actividad">
              {[
                ["Abiertas", data.openConversations],
                ["Handoffs", data.escalatedConversations],
                ["Canales", data.connectedChannels],
                ["Tokens", Math.min(100, Math.round(data.tokensUsed / 1000))],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <span>{label}</span>
                  <strong style={{ height: `${Math.max(12, Number(value) * 12)}px` }} />
                </div>
              ))}
            </div>
          </article>

          <article className="owner-labs-panel" id="canales">
            <div className="owner-labs-panel-heading">
              <div>
                <p>Salud del setup</p>
                <h2>{data.plan}</h2>
              </div>
              <StatusPill label={setupCompleted ? "Listo" : "Pendiente"} tone={setupCompleted ? "success" : "warning"} />
            </div>
            <div className="owner-labs-checklist">
              {data.setup.map((item) => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <StatusPill label={item.ready ? "Listo" : "Pendiente"} tone={item.ready ? "success" : "warning"} />
                </div>
              ))}
            </div>
          </article>

          <article className="owner-labs-panel owner-labs-wide" id="inbox">
            <div className="owner-labs-panel-heading">
              <div>
                <p>Conversaciones que piden atencion</p>
                <h2>Inbox con contexto antes de responder</h2>
              </div>
              <a href="#inbox">Ver todo</a>
            </div>
            {data.criticalConversations.length === 0 ? (
              <div className="owner-labs-empty">
                <strong>Sin conversaciones criticas</strong>
                <span>Los hot leads y derivaciones humanas apareceran aca.</span>
              </div>
            ) : (
              <div className="owner-labs-conversations">
                {data.criticalConversations.map((conversation) => (
                  <article key={conversation.id}>
                    <div>
                      <strong>{conversation.customer} - {conversation.channel}</strong>
                      <p>{conversation.summary}</p>
                    </div>
                    <footer>
                      <StatusPill
                        label={conversation.escalatedToHuman ? "Handoff" : conversation.status}
                        tone={statusTone(conversation.status, conversation.escalatedToHuman)}
                      />
                      <small>{formatDate(conversation.lastMessageAt)}</small>
                    </footer>
                  </article>
                ))}
              </div>
            )}
          </article>

          <article className="owner-labs-panel" id="conocimiento">
            <div className="owner-labs-panel-heading">
              <div>
                <p>Entrenamiento reciente</p>
                <h2>Knowledge base</h2>
              </div>
            </div>
            {data.recentTraining.length === 0 ? (
              <div className="owner-labs-empty">
                <strong>Sin entrenamientos</strong>
                <span>Cuando actualices conocimiento vas a ver el progreso aca.</span>
              </div>
            ) : (
              <div className="owner-labs-training">
                {data.recentTraining.map((item) => (
                  <div key={item.id}>
                    <strong>{item.title}</strong>
                    <span>{item.status} - {formatDate(item.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="owner-labs-panel" id="ajustes">
            <div className="owner-labs-panel-heading">
              <div>
                <p>Tokens</p>
                <h2>Consumo del periodo</h2>
              </div>
            </div>
            <div className="owner-labs-token-card">
              <strong>{data.tokensAvailable.toLocaleString("es-AR")}</strong>
              <span>tokens disponibles</span>
              <p>{data.tokensUsed.toLocaleString("es-AR")} tokens usados.</p>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
