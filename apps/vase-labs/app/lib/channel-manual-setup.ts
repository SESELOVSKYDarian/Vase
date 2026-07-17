import { createHash } from "node:crypto";
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
  create(input: { id: string; assistantId: string; channelType: LabsChannel; webhookUrl: string }): Promise<ManualChannelRecord>;
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

export function getManualChannelId(assistantId: string, channelType: LabsChannel) {
  const digest = createHash("sha256").update(`${assistantId}\0${channelType}`).digest("hex").slice(0, 32);
  return `manual_${digest}`;
}

function isUniqueConflict(error: unknown): error is { code: "P2002" } {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

function isReusableManualChannel(record: ManualChannelRecord | null, channelType: LabsChannel) {
  return Boolean(record && record.type === channelType && record.provider === "META_OFFICIAL" && record.status === "PENDING");
}

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

      const fallback = Object.fromEntries(
        (["WHATSAPP", "INSTAGRAM", "FACEBOOK"] as const).map((type) => [
          type,
          input.context.entitlement.enabledChannels.includes(type) ? 1 : 0,
        ]),
      ) as LabsChannelLimits;
      const limits = input.context.entitlement.channelLimits ?? fallback;
      if (!input.context.entitlement.enabledChannels.includes(input.channelType) || limits[input.channelType] === 0) {
        throw new Error("CHANNEL_NOT_INCLUDED");
      }
      const channelStates = channels.map((channel) => ({
        type: channel.type ?? input.channelType,
        status: channel.status,
        id: channel.id,
      }));
      if (pending) {
        const reuseCapacity = getChannelCapacity(
          limits,
          channelStates.filter((channel) => channel.id !== pending.id),
        )[input.channelType];
        if (reuseCapacity.remaining === 0) throw new Error("CHANNEL_LIMIT_REACHED");
        return { channelId: pending.id, ...manual };
      }
      const capacity = getChannelCapacity(limits, channelStates)[input.channelType];
      if (capacity.remaining === 0) throw new Error("CHANNEL_LIMIT_REACHED");

      const manualChannelId = getManualChannelId(input.assistant.id, input.channelType);
      let created: ManualChannelRecord;
      try {
        created = await repository.create({
          id: manualChannelId,
          assistantId: input.assistant.id,
          channelType: input.channelType,
          webhookUrl: manual.webhookUrl,
        });
      } catch (error) {
        if (!isUniqueConflict(error)) throw error;
        const conflicted = await repository.findByIdForAssistant(input.assistant.id, manualChannelId);
        if (!isReusableManualChannel(conflicted, input.channelType)) throw error;
        created = conflicted!;
      }
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
