import type { LabsChannel, LabsChannelLimits } from "@vase/contracts";
import { getManualChannelId } from "./channel-manual-id";

type ChannelState = { id?: string; type: LabsChannel; status: string };

export function getChannelCapacity(limits: LabsChannelLimits, channels: ChannelState[]) {
  return Object.fromEntries(
    (["WHATSAPP", "INSTAGRAM", "FACEBOOK"] as const).map((type) => {
      const used = channels.filter((channel) => channel.type === type && channel.status !== "DISCONNECTED").length;
      const limit = limits[type];
      return [type, { limit, used, remaining: Math.max(0, limit - used) }];
    }),
  ) as Record<LabsChannel, { limit: number; used: number; remaining: number }>;
}

export function getManualChannelCapacity(limits: LabsChannelLimits, channels: ChannelState[], assistantId: string) {
  return Object.fromEntries(
    (["WHATSAPP", "INSTAGRAM", "FACEBOOK"] as const).map((type) => {
      const included = limits[type] > 0;
      const used = included && channels.some((channel) =>
        (channel.id === getManualChannelId(assistantId, type) || channel.id === undefined) && channel.type === type && channel.status !== "DISCONNECTED",
      ) ? 1 : 0;
      const limit = included ? 1 : 0;
      return [type, { limit, used, remaining: Math.max(0, limit - used) }];
    }),
  ) as Record<LabsChannel, { limit: number; used: number; remaining: number }>;
}

export function assertChannelCapacity(input: {
  channelType: LabsChannel;
  limits: LabsChannelLimits;
  channels: ChannelState[];
}) {
  const capacity = getChannelCapacity(input.limits, input.channels)[input.channelType];
  if (capacity.limit === 0) throw new Error("CHANNEL_NOT_INCLUDED");
  if (capacity.remaining === 0) throw new Error("CHANNEL_LIMIT_REACHED");
  return capacity;
}
