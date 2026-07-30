import type { LabsChannel } from "@vase/contracts";
import type { DiscoveredMetaAsset } from "./meta-connection-service";

type ChannelRecord = { id: string; type: LabsChannel; webhookVerifiedAt: Date | null };

export function createManualMetaConnectionService(input: {
  graph: {
    exchangeForLongLivedUserToken?(accessToken: string): Promise<string>;
    resolveManualAsset(params: { channelType: LabsChannel; accessToken: string; providerAccountId: string; parentId: string | null }): Promise<DiscoveredMetaAsset>;
    verifyAndSubscribe(params: { channelType: LabsChannel; asset: DiscoveredMetaAsset; userAccessToken: string }): Promise<{
      providerAccountId: string; accountLabel: string; externalHandle: string | null; config: Record<string, unknown>; accessToken: string;
    }>;
  };
  repository: {
    find(assistantId: string, channelId: string): Promise<ChannelRecord | null>;
    stage(data: { channelId: string; metaAppId: string; providerAccountId: string; parentId: string | null; encryptedAccessToken: string; encryptedAppSecret: string }): Promise<void>;
    fail(channelId: string, errorCode: string): Promise<void>;
    save(data: {
      channelId: string; providerAccountId: string; phoneNumberId: string | null; wabaId: string | null;
      accountLabel: string; externalHandle: string | null; config: Record<string, unknown>;
      metaAppId: string; encryptedAccessToken: string; encryptedAppSecret: string; status: "CONNECTED" | "PENDING";
    }): Promise<void>;
  };
  encrypt(value: string): string;
}) {
  return {
    async connect(params: { assistantId: string; channelId: string; channelType: LabsChannel; accessToken: string; metaAppId: string; appSecret: string; providerAccountId: string; parentId: string | null }) {
      const channel = await input.repository.find(params.assistantId, params.channelId);
      if (!channel || channel.type !== params.channelType) throw new Error("CHANNEL_NOT_FOUND");
      const encryptedAccessToken = input.encrypt(params.accessToken);
      const encryptedAppSecret = input.encrypt(params.appSecret);
      await input.repository.stage({ channelId: channel.id, metaAppId: params.metaAppId, providerAccountId: params.providerAccountId, parentId: params.parentId, encryptedAccessToken, encryptedAppSecret });
      let verified: Awaited<ReturnType<typeof input.graph.verifyAndSubscribe>>;
      try {
        const durableAccessToken =
          params.channelType !== "WHATSAPP"
          && input.graph.exchangeForLongLivedUserToken
            ? await input.graph.exchangeForLongLivedUserToken(params.accessToken)
            : params.accessToken;
        const asset = await input.graph.resolveManualAsset({ channelType: params.channelType, accessToken: durableAccessToken, providerAccountId: params.providerAccountId, parentId: params.parentId });
        verified = await input.graph.verifyAndSubscribe({ channelType: params.channelType, asset, userAccessToken: durableAccessToken });
      } catch (error) {
        const code = error instanceof Error ? error.message : "META_CONNECTION_FAILED";
        await input.repository.fail(channel.id, code);
        throw error;
      }
      const status = channel.webhookVerifiedAt ? "CONNECTED" as const : "PENDING" as const;
      await input.repository.save({
        channelId: channel.id,
        providerAccountId: verified.providerAccountId,
        phoneNumberId: params.channelType === "WHATSAPP" ? verified.providerAccountId : null,
        wabaId: params.channelType === "WHATSAPP" ? params.parentId : null,
        accountLabel: verified.accountLabel,
        externalHandle: verified.externalHandle,
        config: { ...verified.config, manualWebhook: true, metaAppId: params.metaAppId },
        metaAppId: params.metaAppId,
        encryptedAccessToken: input.encrypt(verified.accessToken),
        encryptedAppSecret,
        status,
      });
      return { status };
    },
  };
}
