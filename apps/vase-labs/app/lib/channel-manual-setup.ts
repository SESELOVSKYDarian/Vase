import type { LabsChannel, LabsChannelLimits } from "@vase/contracts";
import { getChannelCapacity } from "./channel-capacity";
export { getManualChannelId } from "./channel-manual-id";
import { getManualChannelId } from "./channel-manual-id";
import { resolveMetaWebhookVerifyToken } from "./meta-webhook";

export type ManualChannelRecord = {
  id: string;
  type?: LabsChannel;
  provider?: string | null;
  status: string;
  webhookUrl?: string | null;
  config?: unknown;
  lastError?: string | null;
  credentialsPresent?: boolean;
};

export interface ManualChannelRepository {
  list(assistantId: string): Promise<ManualChannelRecord[]>;
  create(input: { id: string; assistantId: string; channelType: LabsChannel; webhookUrl: string }): Promise<ManualChannelRecord>;
  findByIdForAssistant(assistantId: string, channelId: string): Promise<ManualChannelRecord | null>;
  adoptPending?(input: { currentId: string; id: string; assistantId: string; channelType: LabsChannel }): Promise<ManualChannelRecord>;
  reconnect?(input: { id: string; assistantId: string; channelType: LabsChannel; webhookUrl: string }): Promise<ManualChannelRecord>;
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

export function resolveCanonicalLabsOrigin(configuredOrigin: string | undefined) {
  try {
    const url = new URL(configuredOrigin ?? "");
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("invalid protocol");
    return url.origin;
  } catch {
    return "https://labs.vase.ar";
  }
}

function isUniqueConflict(error: unknown): error is { code: "P2002" } {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "P2002");
}

function isReusableManualChannel(record: ManualChannelRecord | null, channelType: LabsChannel) {
  return Boolean(record && record.type === channelType && record.provider === "META_OFFICIAL" && record.status === "PENDING");
}

function isSafeLegacyManualChannel(record: ManualChannelRecord, expectedWebhookUrl: string) {
  if (record.config && typeof record.config === "object" && !Array.isArray(record.config) &&
      (record.config as Record<string, unknown>).manualWebhook === true) return true;
  if (!record.webhookUrl) return false;
  try {
    return new URL(record.webhookUrl).pathname === new URL(expectedWebhookUrl).pathname;
  } catch {
    return false;
  }
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
      const manualChannelId = getManualChannelId(input.assistant.id, input.channelType);
      const pending = channels.find((channel) =>
        channel.id === manualChannelId &&
        channel.type === input.channelType &&
        channel.provider === "META_OFFICIAL" &&
        channel.status === "PENDING",
      );
      const legacyPending = channels.filter((channel) =>
        channel.id !== manualChannelId &&
        channel.type === input.channelType &&
        channel.provider === "META_OFFICIAL" &&
        channel.status === "PENDING" &&
        isSafeLegacyManualChannel(channel, manual.webhookUrl),
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
      const existingManual = channels.find((channel) =>
        channel.id === manualChannelId || (
          channel.type === input.channelType &&
          channel.provider === "META_OFFICIAL" &&
          isSafeLegacyManualChannel(channel, manual.webhookUrl)
        ),
      );
      if (existingManual?.status === "DISCONNECTED" && existingManual.id === manualChannelId && repository.reconnect) {
        const reconnected = await repository.reconnect({
          id: manualChannelId,
          assistantId: input.assistant.id,
          channelType: input.channelType,
          webhookUrl: manual.webhookUrl,
        });
        if (!isReusableManualChannel(reconnected, input.channelType)) throw new Error("CHANNEL_RECONNECT_FAILED");
        return { channelId: reconnected.id, ...manual };
      }
      if (existingManual && existingManual.status !== "PENDING") throw new Error("CHANNEL_MANUAL_CONNECTION_EXISTS");
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
      if (legacyPending.length === 1 && repository.adoptPending) {
        const candidate = legacyPending[0]!;
        const adoptionCapacity = getChannelCapacity(
          limits,
          channelStates.filter((channel) => channel.id !== candidate.id),
        )[input.channelType];
        if (adoptionCapacity.remaining === 0) throw new Error("CHANNEL_LIMIT_REACHED");
        try {
          const adopted = await repository.adoptPending({
            currentId: candidate.id,
            id: manualChannelId,
            assistantId: input.assistant.id,
            channelType: input.channelType,
          });
          if (!isReusableManualChannel(adopted, input.channelType) || adopted.id !== manualChannelId) {
            throw new Error("CHANNEL_LEGACY_ADOPTION_FAILED");
          }
          return { channelId: adopted.id, ...manual };
        } catch (error) {
          if (!isUniqueConflict(error)) throw error;
          const conflicted = await repository.findByIdForAssistant(input.assistant.id, manualChannelId);
          if (conflicted?.type === input.channelType && conflicted.provider === "META_OFFICIAL" && conflicted.status !== "PENDING") {
            throw new Error("CHANNEL_MANUAL_CONNECTION_EXISTS");
          }
          if (!isReusableManualChannel(conflicted, input.channelType)) throw error;
          return { channelId: conflicted!.id, ...manual };
        }
      }
      const capacity = getChannelCapacity(limits, channelStates)[input.channelType];
      if (capacity.remaining === 0) throw new Error("CHANNEL_LIMIT_REACHED");

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
        if (conflicted?.type === input.channelType && conflicted.provider === "META_OFFICIAL" && conflicted.status !== "PENDING") {
          throw new Error("CHANNEL_MANUAL_CONNECTION_EXISTS");
        }
        if (!isReusableManualChannel(conflicted, input.channelType)) throw error;
        created = conflicted!;
      }
      return { channelId: created.id, ...manual };
    },

    async verify(assistantId: string, channelId: string): Promise<ManualChannelVerifyResult> {
      const channel = await repository.findByIdForAssistant(assistantId, channelId);
      if (!channel) throw new Error("CHANNEL_NOT_FOUND");
      if (channel.status === "CONNECTED" && channel.credentialsPresent === false) {
        return { status: "ERROR" as const, message: "Faltan las credenciales de Meta." };
      }
      if (channel.status === "CONNECTED") return { status: "CONNECTED" as const };
      if (channel.status === "PENDING") {
        return { status: "PENDING" as const, message: "Meta todavia no verifico este webhook." };
      }
      return { status: "ERROR" as const, message: "No pudimos verificar este webhook." };
    },
  };
}
