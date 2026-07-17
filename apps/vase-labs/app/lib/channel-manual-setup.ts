import type { LabsChannel, LabsChannelLimits } from "@vase/contracts";
import { getChannelCapacity } from "./channel-capacity";
import { resolveMetaWebhookVerifyToken } from "./meta-webhook";

export type ManualChannelRecord = {
  id: string;
  type?: LabsChannel;
  provider?: string | null;
  status: string;
  webhookUrl?: string | null;
  lastError?: string | null;
};

export interface ManualChannelRepository {
  list(assistantId: string): Promise<ManualChannelRecord[]>;
  create(input: { assistantId: string; channelType: LabsChannel; webhookUrl: string }): Promise<ManualChannelRecord>;
  findByIdForAssistant(assistantId: string, channelId: string): Promise<ManualChannelRecord | null>;
}

export type ManualChannelSetupInput = {
  origin: string;
  channelType: LabsChannel;
  assistant: { id: string };
  context: {
    globalTenantId: string;
    tenantSlug: string;
    entitlement: { enabledChannels: readonly LabsChannel[]; channelLimits?: LabsChannelLimits };
  };
};

export type ManualChannelVerifyResult =
  | { status: "CONNECTED" }
  | { status: "PENDING"; message: string }
  | { status: "ERROR"; message: string };

export function buildManualChannelSetup(input: {
  origin: string;
  tenantSlug: string;
  globalTenantId: string;
  channelType: LabsChannel;
}) {
  const origin = new URL(input.origin).origin;
  return {
    webhookUrl: `${origin}/api/v1/channels/${input.channelType.toLowerCase()}/${encodeURIComponent(input.tenantSlug)}/webhook`,
    webhookKey: resolveMetaWebhookVerifyToken(input.globalTenantId),
  };
}

export function createManualChannelSetupService(repository: ManualChannelRepository) {
  return {
    async setup(input: ManualChannelSetupInput) {
      const manual = buildManualChannelSetup({
        origin: input.origin,
        tenantSlug: input.context.tenantSlug,
        globalTenantId: input.context.globalTenantId,
        channelType: input.channelType,
      });
      const channels = await repository.list(input.assistant.id);
      const pending = channels.find((channel) =>
        channel.type === input.channelType &&
        channel.provider === "META_OFFICIAL" &&
        channel.status === "PENDING",
      );
      if (pending) return { channelId: pending.id, ...manual };

      const fallback = Object.fromEntries(
        (["WHATSAPP", "INSTAGRAM", "FACEBOOK"] as const).map((type) => [
          type,
          input.context.entitlement.enabledChannels.includes(type) ? 1 : 0,
        ]),
      ) as LabsChannelLimits;
      const capacity = getChannelCapacity(input.context.entitlement.channelLimits ?? fallback, channels.map((channel) => ({
        type: channel.type ?? input.channelType,
        status: channel.status,
      })))[input.channelType];
      if (capacity.limit === 0) throw new Error("CHANNEL_NOT_INCLUDED");
      if (capacity.remaining === 0) throw new Error("CHANNEL_LIMIT_REACHED");

      const created = await repository.create({
        assistantId: input.assistant.id,
        channelType: input.channelType,
        webhookUrl: manual.webhookUrl,
      });
      return { channelId: created.id, ...manual };
    },

    async verify(assistantId: string, channelId: string): Promise<ManualChannelVerifyResult> {
      const channel = await repository.findByIdForAssistant(assistantId, channelId);
      if (!channel) throw new Error("CHANNEL_NOT_FOUND");
      if (channel.status === "CONNECTED") return { status: "CONNECTED" as const };
      if (channel.status === "PENDING") {
        return { status: "PENDING" as const, message: "Meta todavia no verifico este webhook." };
      }
      return { status: "ERROR" as const, message: "No pudimos verificar este webhook." };
    },
  };
}
