import type { LabsChannel } from "@vase/contracts";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Cable, CircleAlert, CircleCheck, LockKeyhole } from "lucide-react";
import { labsPrisma } from "../../../../lib/db";
import { listRedactedOfficialChannels } from "../../../../lib/channel-queries";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { LabsPageHeader, LabsSection, LabsStatusPill } from "../labs-ui";
import { getChannelCapacity } from "../../../../lib/channel-capacity";
import { ChannelConnectModal } from "./channel-connect-modal";

export const dynamic = "force-dynamic";

const channelOrder: LabsChannel[] = ["WHATSAPP", "INSTAGRAM", "FACEBOOK"];

const channelCopy: Record<LabsChannel, { title: string; description: string; tag: string }> = {
  WHATSAPP: {
    title: "WhatsApp",
    tag: "wa",
    description: "Atencion comercial, soporte inicial y handoff humano desde WhatsApp Business.",
  },
  INSTAGRAM: {
    title: "Instagram",
    tag: "ig",
    description: "DMs, consultas sociales y mensajes con contexto de IA para responder mas rapido.",
  },
  FACEBOOK: {
    title: "Facebook",
    tag: "fb",
    description: "Mensajes de pagina, leads y conversaciones conectadas al inbox omnicanal.",
  },
};

function statusTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  if (status === "CONNECTED") return "success";
  if (status === "ERROR") return "danger";
  if (status === "PENDING" || status === "QR_READY") return "warning";
  return "neutral";
}

function formatDate(value: string | null) {
  if (!value) return "Sin sincronizar";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function getChannelsPageData() {
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
        redirect("https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs%2Fchannels");
      }
      if (error.message === "LABS_TENANT_FORBIDDEN") {
        redirect("https://app.vase.ar/app?labs=required");
      }
    }
    redirect("https://app.vase.ar/app");
  }

  const channels = await listRedactedOfficialChannels(labsPrisma, resolved.assistant.id);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://labs.vase.ar").trim().replace(/\/$/, "");

  return {
    tenantSlug: resolved.context.tenantSlug,
    plan: resolved.context.entitlement.plan,
    enabledChannels: resolved.context.entitlement.enabledChannels,
    channelLimits: resolved.context.entitlement.channelLimits ?? Object.fromEntries(
      channelOrder.map((channel) => [channel, resolved.context.entitlement.enabledChannels.includes(channel) ? 1 : 0]),
    ) as Record<LabsChannel, number>,
    appUrl,
    channels,
  };
}

export default async function LabsChannelsPage() {
  const data = await getChannelsPageData();
  const connectedCount = data.channels.filter((channel) => channel.status === "CONNECTED").length;
  const capacity = getChannelCapacity(data.channelLimits, data.channels);

  return (
    <div className="space-y-6">
      <div className="labs-page-heading-row">
        <LabsPageHeader
          eyebrow="Entrada de mensajes"
          title="Canales"
          description="Conecta y monitorea WhatsApp, Instagram y Facebook desde el panel operativo de Vase Labs."
        />
        <ChannelConnectModal capacity={capacity} />
      </div>

      <section className="labs-channel-overview" aria-label="Resumen de canales">
        <article>
          <span>Plan actual</span>
          <strong>{data.plan}</strong>
          <p>{Object.values(data.channelLimits).reduce((total, value) => total + value, 0)} conexiones permitidas</p>
        </article>
        <article>
          <span>Conectados</span>
          <strong>{connectedCount}</strong>
          <p>Canales oficiales Meta activos</p>
        </article>
        <article>
          <span>Webhook base</span>
          <strong>Meta</strong>
          <p>{data.appUrl}/api/v1/meta/webhooks/[channel]</p>
        </article>
      </section>

      <section className="labs-channel-grid">
        {channelOrder.map((channelType) => {
          const meta = channelCopy[channelType];
          const matchingChannels = data.channels.filter((item) => item.type === channelType);
          const channel = matchingChannels[0];
          const enabled = capacity[channelType].limit > 0;
          const status = channel?.status ?? "DISCONNECTED";
          const webhookUrl = `${data.appUrl}/api/v1/meta/webhooks/${channelType.toLowerCase()}`;

          return (
            <article className={`labs-channel-card labs-channel-${channelType.toLowerCase()}`} key={channelType}>
              <div className="labs-channel-card-top">
                <span className="labs-channel-tag">{meta.tag}</span>
                <LabsStatusPill
                  label={enabled ? `${capacity[channelType].used}/${capacity[channelType].limit}` : "Sin acceso"}
                  tone={enabled ? statusTone(status) : "warning"}
                />
              </div>

              <div className="labs-channel-card-title">
                {status === "CONNECTED" ? <CircleCheck className="size-5" /> : enabled ? <Cable className="size-5" /> : <LockKeyhole className="size-5" />}
                <h2>{meta.title}</h2>
              </div>
              <p>{meta.description}</p>

              <dl className="labs-channel-facts">
                <div>
                  <dt>Cuenta</dt>
                  <dd>{matchingChannels.length ? `${matchingChannels.length} cuenta${matchingChannels.length === 1 ? "" : "s"}` : "Sin cuenta conectada"}</dd>
                </div>
                <div>
                  <dt>Token</dt>
                  <dd>{channel?.secretStatus ?? "MISSING"}</dd>
                </div>
                <div>
                  <dt>Ultima sincronizacion</dt>
                  <dd>{formatDate(channel?.lastSyncedAt ?? null)}</dd>
                </div>
              </dl>

              <div className="labs-channel-webhook">
                <span>Webhook</span>
                <code>{webhookUrl}</code>
              </div>

              {channel?.lastError ? (
                <div className="labs-channel-error">
                  <CircleAlert className="size-4" />
                  <span>{channel.lastError}</span>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>

      {data.channels.length ? (
        <LabsSection title="Conexiones" description="Todas las cuentas vinculadas, incluso cuando compartan el mismo canal.">
          <div className="labs-connections-list">
            {data.channels.map((channel) => (
              <article key={channel.id}>
                <span className="labs-channel-tag">{channel.type.slice(0, 2)}</span>
                <div><strong>{channel.accountLabel ?? channel.externalHandle ?? channel.type}</strong><p>{channel.type} · {formatDate(channel.lastSyncedAt)}</p></div>
                <LabsStatusPill label={channel.status} tone={statusTone(channel.status)} />
              </article>
            ))}
          </div>
        </LabsSection>
      ) : null}

      <LabsSection
        title="Conexion oficial Meta"
        description="El inicio OAuth se ejecuta desde el endpoint autenticado de conexiones. Esta vista deja visibles estado, token, webhook y errores para soporte."
      >
        <div className="labs-channel-endpoints">
          <div>
            <span>Inicio de conexion</span>
            <code>POST /api/v1/meta/connections/start</code>
          </div>
          <div>
            <span>Canales redacted</span>
            <code>GET /api/v1/channels/{data.tenantSlug}</code>
          </div>
          <div>
            <span>Tenant</span>
            <code>{data.tenantSlug}</code>
          </div>
        </div>
      </LabsSection>
    </div>
  );
}
