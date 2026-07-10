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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6" aria-label="Metricas principales">
        <LabsMetricCard label="Conversaciones abiertas" value={data.summary.openConversations} icon={MessageSquare} tone="info" />
        <LabsMetricCard label="Derivadas a humano" value={data.summary.escalatedConversations} icon={UserRoundCheck} tone="warning" />
        <LabsMetricCard label="Hot leads" value={data.summary.hotLeads} icon={Flame} tone="success" />
        <LabsMetricCard label="Canales conectados" value={data.summary.connectedChannels} icon={Cable} tone="info" />
        <LabsMetricCard label="Conocimiento cargado" value={data.summary.knowledgeItems} icon={Database} tone="neutral" />
        <LabsMetricCard label="Mensajes disponibles" value={data.remainingMessages.toLocaleString("es-AR")} icon={Bot} tone="neutral" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <LabsSection title="Salud del setup" description={`${data.tenantName} · ${data.plan}`}>
          <div className="grid gap-3">
            {[
              ["Conocimiento", data.setupSteps.hasKnowledge],
              ["Canales", data.setupSteps.hasChannel],
              ["Escalamiento humano", data.setupSteps.hasEscalation],
            ].map(([label, ok]) => (
              <article key={String(label)} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <strong>{label}</strong>
                  <LabsStatusPill label={ok ? "Listo" : "Pendiente"} tone={ok ? "success" : "warning"} />
                </div>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{ok ? "Configurado para operar." : "Pendiente de configuracion."}</p>
              </article>
            ))}
          </div>
          {!setupCompleted ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="/app/owner/labs/settings" className="labs-button labs-button-primary">
                Completar setup
                <Route className="size-4" />
              </a>
            </div>
          ) : null}
        </LabsSection>

        <LabsSection title="Capacidad IA" eyebrow="Tokens">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5" aria-label="Uso de tokens">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-[var(--muted)]">Usados</span>
              <strong className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">{data.tokensUsed.toLocaleString("es-AR")}</strong>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-4">
              <span className="text-sm text-[var(--muted)]">Restantes</span>
              <strong className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">{data.remainingTokens.toLocaleString("es-AR")}</strong>
            </div>
            <span className="mt-5 block h-3 overflow-hidden rounded-full bg-[var(--border-subtle)]">
              <span className="block h-full rounded-full bg-[linear-gradient(90deg,var(--accent-strong),rgba(226,139,69,0.88))]" style={{ width: `${data.tokenUsagePercent}%` }} />
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href="/app/owner/labs/settings" className="labs-button labs-button-secondary">Ajustes de IA</a>
          </div>
        </LabsSection>

        <LabsSection title="Canales conectados" eyebrow="Canales">
          <div className="grid gap-3 md:grid-cols-3">
            {data.channelAccess.map(({ channel, access }) => {
              const channelMeta = channelLabels[channel];
              const connected = data.channels.some((item) => item.type === channel && item.status === "CONNECTED");

              return (
                <article
                  className={`relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 ${access.allowed ? "" : "opacity-70"}`}
                  key={channel}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`grid size-11 place-items-center rounded-xl text-xs font-black uppercase text-white ${
                        channelMeta.tone === "instagram"
                          ? "bg-[linear-gradient(145deg,#f08a4b,#d84973_52%,#7c3aed)]"
                          : channelMeta.tone === "facebook"
                            ? "bg-[#2563eb]"
                            : "bg-[linear-gradient(145deg,var(--sage),var(--jade))]"
                      }`}
                      aria-hidden="true"
                    >
                      {channelMeta.tag}
                    </span>
                    <LabsStatusPill
                      label={connected ? "Conectado" : access.allowed ? "Incluido" : "Upgrade"}
                      tone={connected || access.allowed ? "success" : "warning"}
                    />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold tracking-tight text-[var(--foreground)]">{channelMeta.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{channelMeta.description}</p>
                </article>
              );
            })}
          </div>
        </LabsSection>

        <LabsSection
          title="Conversaciones que piden atencion"
          eyebrow="Inbox"
          actions={<a href="/app/owner/labs/activity" className="labs-button labs-button-secondary">Ver todo</a>}
        >
          {data.criticalConversations.length === 0 ? (
            <LabsEmptyState title="Sin conversaciones criticas" description="Los hot leads y derivaciones humanas apareceran aca." />
          ) : (
            <div className="grid gap-3">
              {data.criticalConversations.map((conversation) => (
                <a
                  key={conversation.id}
                  href={`/app/owner/labs/inbox?conversationId=${encodeURIComponent(conversation.id)}`}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 text-[var(--foreground)] no-underline transition hover:bg-[var(--surface-strong)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <strong>{conversation.customerName ?? conversation.customerContact ?? "Cliente"}</strong>
                    <span className="text-xs text-[var(--muted)]">{conversation.channel ? channelLabels[conversation.channel].name : "Labs"}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">{conversation.summary ?? "Sin resumen disponible"}</p>
                  <footer className="mt-3 flex flex-wrap items-center gap-2">
                    <LabsStatusPill label={conversation.intentLabel ?? conversation.status} tone={conversation.escalatedToHuman ? "warning" : statusTone(conversation.status)} />
                    <small className="text-xs text-[var(--muted)]">{formatDate(conversation.lastMessageAt)}</small>
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
