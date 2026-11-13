import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import {
  PanelAlert,
  PanelCard,
  PanelEmpty,
  PanelKpis,
  PanelMeter,
  PanelRow,
  PanelTag,
  type PanelTone,
} from "@vase/ui/panel";
import { labsPrisma } from "../../../lib/db";
import { resolveLabsRequestContext } from "../../../lib/request-context";
import { buildLabsOrderAnalytics } from "../../../lib/order-analytics";
import { fetchBusinessProfile, MI_NEGOCIO_URL } from "../../../lib/business-profile";
import { LabsConversationTrendChart } from "./labs-analytics-charts";
import { buildLabsConversationAnalytics } from "./labs-analytics";
import { channelIconSrc } from "./channels/channel-icons";

export const dynamic = "force-dynamic";

const CHANNEL_NAMES = { WHATSAPP: "WhatsApp", INSTAGRAM: "Instagram", FACEBOOK: "Messenger" } as const;
const CHANNEL_STATE: Record<string, { label: string; tone: PanelTone }> = {
  CONNECTED: { label: "Conectado", tone: "g" },
  PENDING: { label: "Conectando", tone: "y" },
  QR_READY: { label: "Falta escanear", tone: "y" },
  ERROR: { label: "Revisar conexión", tone: "r" },
  DISCONNECTED: { label: "Desconectado", tone: "n" },
};

const number = new Intl.NumberFormat("es-AR");

function ago(value: Date | null) {
  if (!value) return "";
  const minutes = Math.max(1, Math.round((Date.now() - value.getTime()) / 60_000));
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short" }).format(value);
}

async function getHomeData() {
  const requestHeaders = await headers();
  let resolved: Awaited<ReturnType<typeof resolveLabsRequestContext>>;
  try {
    resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("LABS_SESSION")) {
      redirect("https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs");
    }
    redirect("https://app.vase.ar/app");
  }

  const tenantId = resolved.context.globalTenantId;
  const [entitlement, channels, conversations, knowledgeCount, orders, profile] = await Promise.all([
    labsPrisma.labsEntitlement.findUnique({ where: { globalTenantId: tenantId } }),
    labsPrisma.channel.findMany({ where: { assistantId: resolved.assistant.id }, orderBy: { updatedAt: "desc" } }),
    labsPrisma.conversation.findMany({
      where: { assistantId: resolved.assistant.id },
      orderBy: [{ escalatedToHuman: "desc" }, { lastMessageAt: "desc" }],
      take: 60,
    }),
    labsPrisma.knowledgeItem.count({ where: { assistantId: resolved.assistant.id, status: "READY" } }),
    labsPrisma.businessOrderProjection.findMany({
      where: { globalTenantId: tenantId },
      orderBy: { businessUpdatedAt: "desc" },
      take: 200,
    }),
    fetchBusinessProfile(tenantId),
  ]);

  return { entitlement, channels, conversations, knowledgeCount, orders, profile, plan: entitlement?.plan ?? resolved.context.entitlement.plan };
}

export default async function LabsHomePage() {
  const data = await getHomeData();
  const analytics = buildLabsConversationAnalytics(
    data.conversations.map((c) => ({
      channel: c.channel,
      intentLabel: c.intentLabel,
      escalatedToHuman: c.escalatedToHuman,
      lastMessageAt: c.lastMessageAt,
    })),
  );
  const orderAnalytics = buildLabsOrderAnalytics(data.orders);
  const open = data.conversations.filter((c) => c.status !== "CLOSED");
  const needYou = open.filter((c) => c.status === "ESCALATED" || c.escalatedToHuman);
  const connected = data.channels.filter((c) => c.status === "CONNECTED").length;
  const totalTokens = (data.entitlement?.tokensIncluded ?? 0) + (data.entitlement?.extraTokens ?? 0);
  const usedPct = totalTokens > 0 ? ((data.entitlement?.tokensUsed ?? 0) / totalTokens) * 100 : 0;
  const hasProfile = Boolean(data.profile && (data.profile.phone || data.profile.whatsapp || data.profile.hours || data.profile.branches?.length));
  const setup = [
    { done: hasProfile, label: "Datos del negocio", detail: hasProfile ? "Los toma de Mi negocio" : "Cargalos en Mi negocio", href: MI_NEGOCIO_URL },
    { done: data.knowledgeCount > 0, label: "Lo que sabe", detail: data.knowledgeCount > 0 ? `${data.knowledgeCount} documentos listos` : "Sumá precios, preguntas frecuentes o tu web", href: "/anterior/knowledge" },
    { done: connected > 0, label: "Canales", detail: connected > 0 ? `${connected} conectados` : "Conectá WhatsApp, Instagram o Messenger", href: "/anterior/settings" },
  ];
  const pending = setup.filter((step) => !step.done);
  const oldest = needYou.reduce<Date | null>((min, c) => (c.lastMessageAt && (!min || c.lastMessageAt < min) ? c.lastMessageAt : min), null);

  return (
    <>
      {needYou.length > 0 ? (
        <PanelAlert
          icon={<CircleAlert size={20} />}
          title={needYou.length === 1 ? "1 conversación te necesita" : `${needYou.length} conversaciones te necesitan`}
          action={<Link href="/anterior/inbox" className="vpa-btn ink">Responder</Link>}
        >
          La IA las pasó a una persona.{oldest ? ` La más vieja espera ${ago(oldest)}.` : ""}
        </PanelAlert>
      ) : pending.length > 0 ? (
        <PanelAlert
          icon={<CircleAlert size={20} />}
          title={`Te falta${pending.length > 1 ? "n" : ""} ${pending.length} paso${pending.length > 1 ? "s" : ""} para que tu asistente responda solo`}
          action={pending[0].href.startsWith("http") ? <a href={pending[0].href} className="vpa-btn ink">Completar</a> : <Link href={pending[0].href as never} className="vpa-btn ink">Completar</Link>}
        >
          {pending.map((step) => step.label).join(" · ")}
        </PanelAlert>
      ) : null}

      <PanelKpis
        items={[
          { label: "Conversaciones abiertas", value: number.format(open.length), detail: `${number.format(analytics.total)} en las últimas semanas` },
          { label: "Te necesitan", value: number.format(needYou.length), detail: "Pasaron a una persona" },
          { label: "Quieren comprar", value: number.format(analytics.hotLeads), detail: "Según lo que escriben" },
          { label: "Pedidos por chat", value: number.format(orderAnalytics.totalOrders), detail: orderAnalytics.totalsByCurrency[0] ? new Intl.NumberFormat("es-AR", { style: "currency", currency: orderAnalytics.totalsByCurrency[0].currency, maximumFractionDigits: 0 }).format(orderAnalytics.totalsByCurrency[0].total) : "Todavía ninguno" },
        ]}
      />

      <div className="vpa-g2">
        <PanelCard title="Conversaciones" description="Cuántas atendió tu asistente y cuántas pasaron a una persona.">
          {analytics.total === 0 ? <PanelEmpty>Cuando te escriban, vas a ver acá cómo vienen.</PanelEmpty> : <LabsConversationTrendChart analytics={analytics} />}
        </PanelCard>
        <div className="vpa-gs">
          <PanelCard title="Canales" actions={<Link href="/anterior/settings" className="vpa-lnk">Ver</Link>}>
            {data.channels.length === 0 ? (
              <PanelEmpty action={<Link href="/anterior/settings" className="vpa-btn acc sm">Conectar un canal</Link>}>Todavía no conectaste ningún canal.</PanelEmpty>
            ) : (
              data.channels.map((channel) => {
                const state = CHANNEL_STATE[channel.status] ?? CHANNEL_STATE.DISCONNECTED;
                return (
                  <PanelRow
                    key={channel.id}
                    // eslint-disable-next-line @next/next/no-img-element
                    lead={<img src={channelIconSrc[channel.type]} alt="" width={32} height={32} />}
                    title={CHANNEL_NAMES[channel.type]}
                    detail={channel.accountLabel ?? channel.externalHandle ?? "Cuenta sin nombre"}
                  >
                    <PanelTag tone={state.tone}>{state.label}</PanelTag>
                  </PanelRow>
                );
              })
            )}
          </PanelCard>
          {pending.length > 0 ? (
            <PanelCard title="Puesta en marcha" description={`${setup.length - pending.length} de ${setup.length} listos`}>
              {setup.map((step) => (
                <PanelRow key={step.label} title={step.label} detail={step.detail}>
                  {step.done ? (
                    <PanelTag tone="g">Listo</PanelTag>
                  ) : step.href.startsWith("http") ? (
                    <a href={step.href} className="vpa-btn line sm">Completar</a>
                  ) : (
                    <Link href={step.href as never} className="vpa-btn line sm">Completar</Link>
                  )}
                </PanelRow>
              ))}
            </PanelCard>
          ) : (
            <PanelCard title="Uso del mes" actions={<PanelTag>Plan {data.plan}</PanelTag>}>
              <PanelMeter value={usedPct} />
              <p>{Math.round(usedPct)}% usado</p>
            </PanelCard>
          )}
        </div>
      </div>

      <PanelCard title="Te necesitan" description="Conversaciones que la IA pasó a una persona." actions={<Link href="/anterior/inbox" className="vpa-lnk">Ir a Conversaciones</Link>}>
        {needYou.length === 0 ? (
          <PanelEmpty>Nadie está esperando. Tu asistente viene respondiendo solo.</PanelEmpty>
        ) : (
          needYou.slice(0, 5).map((conversation) => (
            <PanelRow
              key={conversation.id}
              title={conversation.customerName ?? conversation.customerContact ?? "Cliente"}
              detail={conversation.summary ?? "Sin resumen todavía"}
            >
              <span className="vpa-mut" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{ago(conversation.lastMessageAt)}</span>
              <Link href={`/anterior/inbox?conversationId=${conversation.id}` as never} className="vpa-btn line sm">Responder</Link>
            </PanelRow>
          ))
        )}
      </PanelCard>
    </>
  );
}
