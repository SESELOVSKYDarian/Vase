import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Bot, Cable, Database, MessageSquare, Route } from "lucide-react";
import { labsPrisma } from "../../../lib/db";
import { resolveLabsRequestContext } from "../../../lib/request-context";
import {
  LabsEmptyState,
  LabsMetricCard,
  LabsPageHeader,
  LabsSection,
  LabsStatusPill,
} from "./labs-ui";
import { LabsConversationTrendChart, LabsIntentDistributionChart } from "./labs-analytics-charts";
import { buildLabsConversationAnalytics } from "./labs-analytics";

export const dynamic = "force-dynamic";

function trainingTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "READY":
      return "success";
    case "FAILED":
      return "danger";
    case "PROCESSING":
    case "QUEUED":
      return "warning";
    default:
      return "neutral";
  }
}

function conversationTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  switch (status) {
    case "ESCALATED":
      return "warning";
    case "CLOSED":
      return "neutral";
    default:
      return "info";
  }
}

function formatDate(value: Date | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
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

  const openConversations = conversations.filter((c) => c.status === "OPEN").length;
  const escalatedConversations = conversations.filter(
    (c) => c.status === "ESCALATED" || c.escalatedToHuman,
  ).length;
  const connectedChannels = channels.filter((c) => c.status === "CONNECTED").length;
  const tokensUsed = entitlement?.tokensUsed ?? tokenUsage._sum.totalTokens ?? 0;
  const readyKnowledge = knowledgeItems.filter((item) => item.status === "READY").length;

  const criticalConversations = conversations
    .filter((c) => c.intentLabel === "HOT_LEAD" || c.escalatedToHuman)
    .slice(0, 5);

  const setupSteps = {
    hasKnowledge: knowledgeItems.length > 0,
    hasChannel: connectedChannels > 0,
    hasEscalation: escalatedConversations > 0 || conversations.length > 0,
  };

  return {
    plan: entitlement?.plan ?? resolved.context.entitlement.plan,
    openConversations,
    escalatedConversations,
    connectedChannels,
    knowledgeItemCount: knowledgeItems.length,
    readyKnowledge,
    tokensUsed,
    conversations,
    knowledgeItems,
    criticalConversations,
    setupSteps,
  };
}

export default async function LabsDashboardPage() {
  const data = await getOwnerLabsData();
  const analytics = buildLabsConversationAnalytics(
    data.conversations.map((c) => ({
      channel: c.channel,
      intentLabel: c.intentLabel,
      escalatedToHuman: c.escalatedToHuman,
      lastMessageAt: c.lastMessageAt,
    })),
  );
  const setupCompleted =
    data.setupSteps.hasKnowledge && data.setupSteps.hasChannel && data.setupSteps.hasEscalation;

  return (
    <div className="space-y-6">
      <LabsPageHeader
        title="Bienvenido a Vase Labs"
        description="Centro de IA y automatizacion para llevar conversaciones, conocimiento y operaciones en un solo lugar."
      />

      <section className="grid gap-4 xl:grid-cols-3">
        <Link href="/app/owner/labs/chatbots" className="labs-action-card">
          <div>
            <p>Constructor</p>
            <strong>Crear chatbot</strong>
          </div>
          <span aria-hidden="true">
            <Bot className="size-5" />
          </span>
        </Link>
        <Link href="/app/owner/labs/activity" className="labs-action-card">
          <div>
            <p>Flujos</p>
            <strong>Nueva automatizacion</strong>
          </div>
          <span aria-hidden="true">
            <Cable className="size-5" />
          </span>
        </Link>
        <Link href="/app/owner/labs/settings" className="labs-action-card">
          <div>
            <p>Inteligencia</p>
            <strong>Configurar IA</strong>
          </div>
          <span aria-hidden="true">
            <Database className="size-5" />
          </span>
        </Link>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <LabsMetricCard label="Leads operativos" value={data.knowledgeItemCount} detail="Items activos de conocimiento." icon={Database} tone="neutral" />
        <LabsMetricCard label="Conversiones" value={data.connectedChannels} detail="Canales conectados o pendientes." icon={Cable} tone="info" />
        <LabsMetricCard label="Bots activos" value={data.openConversations} detail="Conversaciones abiertas recientes." icon={MessageSquare} tone="info" />
        <LabsMetricCard label="Ahorro de tiempo" value={data.escalatedConversations} detail="Casos derivados a humano." icon={Bot} tone="success" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <LabsSection title="Ritmo de conversaciones">
          <LabsConversationTrendChart analytics={analytics} />
        </LabsSection>
        <LabsSection title="Distribucion de intencion">
          <LabsIntentDistributionChart analytics={analytics} />
        </LabsSection>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <LabsSection title="Salud del setup" description={data.plan}>
          <div className="grid gap-3">
            {([
              ["Conocimiento", data.setupSteps.hasKnowledge],
              ["Canales", data.setupSteps.hasChannel],
              ["Escalamiento humano", data.setupSteps.hasEscalation],
            ] as const).map(([label, ok]) => (
              <div key={label} className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3">
                <span className="text-sm font-semibold text-[var(--foreground)]">{label}</span>
                <LabsStatusPill label={ok ? "Listo" : "Pendiente"} tone={ok ? "success" : "warning"} />
              </div>
            ))}
          </div>
          {!setupCompleted ? (
            <Link href="/app/owner/labs/setup" className="labs-button labs-button-primary mt-4">
              Completar setup
              <Route className="size-4" />
            </Link>
          ) : null}
        </LabsSection>

        <LabsSection
          title="Conversaciones que piden atencion"
          actions={
            <Link href="/app/owner/labs/activity" className="labs-button labs-button-secondary">
              Ver todo
            </Link>
          }
        >
          {data.criticalConversations.length === 0 ? (
            <LabsEmptyState title="Sin conversaciones criticas" description="Los hot leads y derivaciones humanas apareceran aca." />
          ) : (
            <div className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-lg border border-[var(--border-subtle)]">
              {data.criticalConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="grid gap-2 bg-[var(--surface)] p-4 transition-colors hover:bg-[var(--surface-strong)] md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">
                      {conversation.customerName ?? conversation.customerContact ?? "Cliente"} - {conversation.channel ?? "LABS"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                      {conversation.summary ?? "Sin resumen disponible"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <LabsStatusPill
                      label={conversation.intentLabel ?? conversation.status}
                      tone={conversation.escalatedToHuman ? "warning" : conversationTone(conversation.status)}
                    />
                    <span className="text-xs text-[var(--muted)]">{formatDate(conversation.lastMessageAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </LabsSection>
      </section>

      <LabsSection title="Entrenamiento reciente">
        {data.knowledgeItems.length === 0 ? (
          <LabsEmptyState title="Sin entrenamientos" description="Cuando actualices conocimiento vas a ver el progreso aca." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {data.knowledgeItems.slice(0, 4).map((item) => (
              <div key={item.id} className="labs-subpanel p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--foreground)]">{item.title}</p>
                  <LabsStatusPill label={item.status} tone={trainingTone(item.status)} />
                </div>
                <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                  {formatDate(item.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </LabsSection>
    </div>
  );
}
