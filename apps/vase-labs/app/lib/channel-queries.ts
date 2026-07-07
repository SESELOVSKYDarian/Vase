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
