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
    },
    include: {
      secrets: {
        where: { kind: "META_ACCESS_TOKEN" },
        select: { id: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return channels.map((channel) =>
    redactedChannelSummarySchema.parse({
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
    }),
  );
}

export async function listManualChannelStates(prisma: PrismaClient, assistantId: string) {
  const channels = await prisma.channel.findMany({
    where: { assistantId, provider: "META_OFFICIAL" },
    select: { id: true, type: true, status: true, config: true },
  });
  return channels.flatMap((channel) => {
    const marked = channel.config && typeof channel.config === "object" && !Array.isArray(channel.config) &&
      (channel.config as Record<string, unknown>).manualWebhook === true;
    return marked ? [{ type: channel.type, status: channel.status }] : [{ id: channel.id, type: channel.type, status: channel.status }];
  });
}
