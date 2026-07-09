import { ChannelsWorkbench } from "@/components/labs/channels-workbench";
import { LabsPageHeader } from "@/components/labs/labs-ui";
import { resolveMetaWebhookVerifyToken } from "@/lib/integrations/meta-webhook";
import { getLabsOwnerPageData } from "../_lib/labs-owner";
import { LabsModuleDisabledCard } from "../ui";

export default async function LabsIntegrationsPage() {
  const { dashboard, labsEnabled, membership } = await getLabsOwnerPageData();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.vase.ar").trim().replace(/\/$/, "");
  const webhookPreviewUrl = `${appUrl}/api/v1/channels/whatsapp/${membership.tenant.slug}/webhook`;
  const webhookVerifyToken = resolveMetaWebhookVerifyToken(membership.tenant.slug);

  return (
    <div className="space-y-6">
      <LabsPageHeader
        eyebrow="Entrada de mensajes"
        title="Canales"
        description="Conecta y monitorea los canales por donde llegan conversaciones al asistente."
      />

      {!labsEnabled ? (
        <LabsModuleDisabledCard />
      ) : (
        <ChannelsWorkbench
          channels={dashboard.channels}
          canUseInstagram={dashboard.limits.canUseInstagram}
          webhookPreviewUrl={webhookPreviewUrl}
          webhookVerifyToken={webhookVerifyToken}
        />
      )}
    </div>
  );
}
