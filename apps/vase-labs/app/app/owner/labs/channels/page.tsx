import type { LabsChannel } from "@vase/contracts";
import { CircleAlert } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getManualChannelCapacity } from "../../../../lib/channel-capacity";
import { listManualChannelStates, listRedactedOfficialChannels } from "../../../../lib/channel-queries";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { LabsPageHeader, LabsStatusPill } from "../labs-ui";
import { ChannelConnectModal } from "./channel-connect-modal";

export const dynamic = "force-dynamic";
const channelOrder: LabsChannel[] = ["WHATSAPP", "INSTAGRAM", "FACEBOOK"];
const channelNames: Record<LabsChannel, string> = { WHATSAPP: "WhatsApp", INSTAGRAM: "Instagram", FACEBOOK: "Facebook" };

function statusTone(status: string): "neutral" | "success" | "warning" | "danger" {
  if (status === "CONNECTED") return "success";
  if (status === "ERROR") return "danger";
  if (status === "PENDING" || status === "QR_READY") return "warning";
  return "neutral";
}

function formatDate(value: string | null) {
  if (!value) return "Sin sincronizar";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

async function getChannelsPageData() {
  const requestHeaders = await headers();
  let resolved: Awaited<ReturnType<typeof resolveLabsRequestContext>>;
  try { resolved = await resolveLabsRequestContext(requestHeaders.get("cookie")); }
  catch (error) {
    if (error instanceof Error && ["LABS_SESSION_REQUIRED", "LABS_SESSION_INVALID", "LABS_SESSION_EXPIRED", "LABS_AUTH_SECRET_MISSING"].includes(error.message)) redirect("https://app.vase.ar/signin?redirectTo=%2Fapp%2Fowner%2Flabs%2Fchannels");
    if (error instanceof Error && error.message === "LABS_TENANT_FORBIDDEN") redirect("https://app.vase.ar/app?labs=required");
    redirect("https://app.vase.ar/app");
  }
  const [channels, manualChannelStates] = await Promise.all([
    listRedactedOfficialChannels(labsPrisma, resolved.assistant.id),
    listManualChannelStates(labsPrisma, resolved.assistant.id),
  ]);
  return {
    channelLimits: resolved.context.entitlement.channelLimits ?? Object.fromEntries(channelOrder.map((channel) => [channel, resolved.context.entitlement.enabledChannels.includes(channel) ? 1 : 0])) as Record<LabsChannel, number>,
    channels,
    manualChannelStates,
    assistantId: resolved.assistant.id,
  };
}

export default async function LabsChannelsPage() {
  const data = await getChannelsPageData();
  const capacity = getManualChannelCapacity(data.channelLimits, data.manualChannelStates, data.assistantId);
  return <div className="space-y-6">
    <LabsPageHeader eyebrow="Entrada de mensajes" title="Canales" description="Conectá y monitoreá WhatsApp, Instagram y Facebook desde Vase Labs." />
    {data.channels.length === 0 ? (
      <section className="labs-empty-state labs-channels-empty">
        <p>Todavía no agregaste ningún canal. Sumá el primero para empezar a recibir conversaciones.</p>
        <ChannelConnectModal capacity={capacity} />
      </section>
    ) : (
      <>
        <div className="labs-page-heading-row labs-channels-actions"><span /><ChannelConnectModal capacity={capacity} /></div>
        <section className="labs-connections-list" aria-label="Canales conectados">
          {data.channels.map((channel) => <article key={channel.id} className="labs-channel-record">
            <span className="labs-channel-tag">{channel.type.slice(0, 2)}</span>
            <div className="labs-channel-record-body">
              <div><strong>{channel.accountLabel ?? channel.externalHandle ?? "Cuenta sin nombre"}</strong><p>{channelNames[channel.type]} · {formatDate(channel.lastSyncedAt ?? channel.connectedAt)}</p></div>
              <dl className="labs-channel-record-facts"><div><dt>Estado</dt><dd>{channel.status}</dd></div><div><dt>Credencial</dt><dd>{channel.secretStatus}</dd></div></dl>
              {channel.lastError ? <p className="labs-channel-error"><CircleAlert className="size-4" /><span>{channel.lastError}</span></p> : null}
            </div>
            <LabsStatusPill label={channel.status} tone={statusTone(channel.status)} />
          </article>)}
        </section>
      </>
    )}
  </div>;
}
