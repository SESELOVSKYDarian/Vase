import type { LabsChannel } from "@vase/contracts";
import type { DiscoveredMetaAsset } from "./meta-connection-service";

type ChannelRecord = { id: string; type: LabsChannel; webhookVerifiedAt: Date | null };

export function createManualMetaConnectionService(input: {
  graph: {
    discoverAssets(params: { channelType: LabsChannel; accessToken: string }): Promise<DiscoveredMetaAsset[]>;
    verifyAndSubscribe(params: { channelType: LabsChannel; asset: DiscoveredMetaAsset; userAccessToken: string }): Promise<{
      providerAccountId: string; accountLabel: string; externalHandle: string | null; config: Record<string, unknown>; accessToken: string;
    }>;
  };
  repository: {
    find(assistantId: string, channelId: string): Promise<ChannelRecord | null>;
    save(data: {
      channelId: string; providerAccountId: string; phoneNumberId: string | null; wabaId: string | null;
      accountLabel: string; externalHandle: string | null; config: Record<string, unknown>;
      encryptedAccessToken: string; status: "CONNECTED" | "PENDING";
    }): Promise<void>;
  };
  encrypt(value: string): string;
}) {
  return {
    async connect(params: { assistantId: string; channelId: string; channelType: LabsChannel; accessToken: string; providerAccountId: string; parentId: string | null }) {
      const channel = await input.repository.find(params.assistantId, params.channelId);
      if (!channel || channel.type !== params.channelType) throw new Error("CHANNEL_NOT_FOUND");
      const assets = await input.graph.discoverAssets({ channelType: params.channelType, accessToken: params.accessToken });
      const asset = assets.find((candidate) => candidate.candidate.id === params.providerAccountId &&
        (params.channelType === "FACEBOOK" || (candidate.parentId ?? candidate.candidate.parentId ?? null) === params.parentId));
      if (!asset) throw new Error("META_ASSET_NOT_AUTHORIZED");
      const verified = await input.graph.verifyAndSubscribe({ channelType: params.channelType, asset, userAccessToken: params.accessToken });
      const status = channel.webhookVerifiedAt ? "CONNECTED" as const : "PENDING" as const;
      await input.repository.save({
        channelId: channel.id,
        providerAccountId: verified.providerAccountId,
        phoneNumberId: params.channelType === "WHATSAPP" ? verified.providerAccountId : null,
        wabaId: params.channelType === "WHATSAPP" ? params.parentId : null,
        accountLabel: verified.accountLabel,
        externalHandle: verified.externalHandle,
        config: { ...verified.config, manualWebhook: true },
        encryptedAccessToken: input.encrypt(verified.accessToken),
        status,
      });
      return { status };
    },
  };
}
