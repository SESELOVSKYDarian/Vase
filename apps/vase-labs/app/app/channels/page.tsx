import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ChannelsClient } from "./channels-client";
import { listRedactedOfficialChannels } from "../../lib/channel-queries";
import { labsPrisma } from "../../lib/db";
import { resolveLabsRequestContext } from "../../lib/request-context";

export const dynamic = "force-dynamic";

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.LABS_UI_PREVIEW === "true"
  ) {
    return (
      <ChannelsClient
        tenantName="Norte Equipos · Vista QA"
        enabledChannels={["WHATSAPP", "INSTAGRAM", "FACEBOOK"]}
        channels={[{
          id: "preview-channel",
          type: "WHATSAPP",
          provider: "META_OFFICIAL",
          status: "CONNECTED",
          accountLabel: "Ventas y soporte",
          externalHandle: "+54 9 11 5555 5555",
          providerAccountId: "preview-phone",
          connectedAt: new Date().toISOString(),
          lastSyncedAt: new Date().toISOString(),
          lastError: null,
          secretStatus: "CONFIGURED",
        }]}
      />
    );
  }

  const requestHeaders = await headers();
  let resolved: Awaited<ReturnType<typeof resolveLabsRequestContext>>;

  try {
    resolved = await resolveLabsRequestContext(requestHeaders.get("cookie"));
  } catch {
    redirect("https://app.vase.ar/signin?redirectTo=%2Fapp%2Fchannels");
  }

  const query = await searchParams;
  const attempt = typeof query.attempt === "string" ? query.attempt : undefined;
  const oauth = typeof query.oauth === "string" ? query.oauth : undefined;
  const reason = typeof query.reason === "string" ? query.reason : undefined;
  const channels = await listRedactedOfficialChannels(
    labsPrisma,
    resolved.assistant.id,
  );

  return (
    <ChannelsClient
      tenantName={resolved.context.tenantName}
      enabledChannels={resolved.context.entitlement.enabledChannels}
      channels={channels}
      initialAttemptId={attempt}
      oauthState={oauth}
      oauthReason={reason}
    />
  );
}
