import type { LabsChannel } from "@vase/contracts";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getManualChannelCapacity } from "../../../../lib/channel-capacity";
import { listManualChannelStates, listRedactedOfficialChannels } from "../../../../lib/channel-queries";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { LabsPageHeader } from "../labs-ui";
import { ChannelConnectModal } from "./channel-connect-modal";
import { ChannelCard } from "./channel-card";
import { MetaOAuthResume } from "./meta-oauth-resume";

export const dynamic = "force-dynamic";
const channelOrder: LabsChannel[] = ["WHATSAPP", "INSTAGRAM", "FACEBOOK"];
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

export default async function LabsChannelsPage({ searchParams }: { searchParams: Promise<{ attempt?: string }> }) {
  const data = await getChannelsPageData();
  const query = await searchParams;
  const capacity = getManualChannelCapacity(data.channelLimits, data.manualChannelStates, data.assistantId);
  return <div className="space-y-6"><MetaOAuthResume attemptId={query.attempt} />
    <LabsPageHeader eyebrow="Entrada de mensajes" title="Canales" description="Conectá y monitoreá WhatsApp, Instagram y Facebook desde Vase Labs." />
    <div className="labs-page-heading-row labs-channels-actions"><span>Revisá el estado de cada canal antes de abrir la bandeja.</span><ChannelConnectModal capacity={capacity} /></div>
    <section className="labs-channel-grid" aria-label="Canales disponibles">
      {channelOrder.map((type) => <ChannelCard key={type} type={type} capacity={capacity} channel={data.channels.find((channel) => channel.type === type) ?? null} />)}
    </section>
  </div>;
}
