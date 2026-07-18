import type { PrismaClient } from "./db";
import {
  redactedChannelSummarySchema,
  type RedactedChannelSummary,
} from "@vase/contracts";

export async function listRedactedOfficialChannels(
  prisma: PrismaClient,
  assistantId: string,
): Promise<RedactedChannelSummary[]> {
  const channels = await prisma.channel.findMany({
    where: {
      assistantId,
      provider: "META_OFFICIAL",
      status: { not: "DISCONNECTED" },
    },
    include: {
      secrets: {
        where: { kind: "META_ACCESS_TOKEN" },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return channels.map((channel) => {
    const config = channel.config && typeof channel.config === "object" && !Array.isArray(channel.config)
      ? channel.config as Record<string, unknown> : {};
    const credentialsPresent = channel.secrets.length > 0;
    const assetVerified = Boolean(channel.providerAccountId);
    const subscriptionActive = Array.isArray(config.subscribedFields) && config.subscribedFields.length > 0;
    return redactedChannelSummarySchema.parse({
      id: channel.id,
      type: channel.type,
      provider: "META_OFFICIAL",
      status: channel.status,
      accountLabel: channel.accountLabel,
      externalHandle: channel.externalHandle,
      providerAccountId: channel.providerAccountId,
      connectedAt: channel.connectedAt?.toISOString() ?? null,
      lastSyncedAt: channel.lastSyncedAt?.toISOString() ?? null,
      lastError: channel.lastError,
      secretStatus: channel.secrets.length ? "CONFIGURED" : "MISSING",
      webhookVerified: Boolean(channel.webhookVerifiedAt),
      credentialsPresent,
      assetVerified,
      subscriptionActive,
    });
  });
}

type ManualStateSource = { id: string; type: RedactedChannelSummary["type"]; status: string; config: unknown };

export function deriveManualChannelStates(channels: ManualStateSource[]) {
  return channels.map((channel) => {
    const marked = channel.config && typeof channel.config === "object" && !Array.isArray(channel.config) &&
      (channel.config as Record<string, unknown>).manualWebhook === true;
    return marked ? { type: channel.type, status: channel.status } : { id: channel.id, type: channel.type, status: channel.status };
  });
}

export async function listManualChannelStates(prisma: PrismaClient, assistantId: string) {
  const channels = await prisma.channel.findMany({
    where: { assistantId, provider: "META_OFFICIAL" },
    select: { id: true, type: true, status: true, config: true },
  });
  return deriveManualChannelStates(channels);
}
