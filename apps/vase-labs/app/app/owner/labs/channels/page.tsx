import type { LabsChannel } from "@vase/contracts";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { labsPrisma } from "../../../../lib/db";
import { listRedactedOfficialChannels } from "../../../../lib/channel-queries";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { LabsPageHeader, LabsSection, LabsStatusPill } from "../labs-ui";

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
    appUrl,
    channels,
  };
}

export default async function LabsChannelsPage() {
  const data = await getChannelsPageData();
  const connectedCount = data.channels.filter((channel) => channel.status === "CONNECTED").length;

  return (
    <div className="space-y-6">
      <LabsPageHeader
        eyebrow="Entrada de mensajes"
        title="Canales"
        description="Conecta y monitorea WhatsApp, Instagram y Facebook desde el panel operativo de Vase Labs."
      />

      <section className="metric-grid" aria-label="Resumen de canales">
        <article className="metric-card">
          <span>Plan actual</span>
          <strong>{data.plan}</strong>
          <p>{data.enabledChannels.length} canales habilitados por contrato</p>
        </article>
        <article className="metric-card">
          <span>Conectados</span>
          <strong>{connectedCount}</strong>
          <p>Canales oficiales Meta activos</p>
        </article>
        <article className="metric-card">
          <span>Webhook base</span>
          <strong>Meta</strong>
          <p>{data.appUrl}/api/v1/meta/webhooks/[channel]</p>
        </article>
      </section>

      <section className="panel channels-panel">
        <div className="section-heading">
          <p className="eyebrow">Canales por plan</p>
          <h2>Estado de las conexiones oficiales.</h2>
        </div>
        <div className="channel-grid">
          {channelOrder.map((channelType) => {
            const meta = channelCopy[channelType];
            const channel = data.channels.find((item) => item.type === channelType);
            const enabled = data.enabledChannels.includes(channelType);
            const status = channel?.status ?? "DISCONNECTED";
            const webhookUrl = `${data.appUrl}/api/v1/meta/webhooks/${channelType.toLowerCase()}`;

            return (
              <article className={`channel-card ${channelType.toLowerCase()} ${enabled ? "" : "is-locked"}`} key={channelType}>
                <div className="channel-topline">
                  <span className="channel-badge" aria-hidden="true">{meta.tag}</span>
                  <LabsStatusPill
                    label={enabled ? status : "Upgrade"}
                    tone={enabled ? statusTone(status) : "warning"}
                  />
                </div>

                <h3>{meta.title}</h3>
                <p>{meta.description}</p>
                <ul>
                  <li>Cuenta: {channel?.accountLabel ?? channel?.externalHandle ?? "Sin cuenta conectada"}</li>
                  <li>Token: {channel?.secretStatus ?? "MISSING"}</li>
                  <li>Ultima sincronizacion: {formatDate(channel?.lastSyncedAt ?? null)}</li>
                </ul>

                <div className="conversation-card">
                  <strong>Webhook</strong>
                  <p><code>{webhookUrl}</code></p>
                </div>

                {channel?.lastError ? (
                  <div className="conversation-card is-locked">
                    <strong>Error de conexion</strong>
                    <p>{channel.lastError}</p>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <LabsSection
        title="Conexion oficial Meta"
        description="El inicio OAuth se ejecuta desde el endpoint autenticado de conexiones. Esta vista deja visibles estado, token, webhook y errores para soporte."
      >
        <div className="plans-grid">
          <div className="plan-card">
            <span>Inicio de conexion</span>
            <code>POST /api/v1/meta/connections/start</code>
          </div>
          <div className="plan-card">
            <span>Canales redacted</span>
            <code>GET /api/v1/channels/{data.tenantSlug}</code>
          </div>
          <div className="plan-card">
            <span>Tenant</span>
            <code>{data.tenantSlug}</code>
          </div>
        </div>
      </LabsSection>
    </div>
  );
}
