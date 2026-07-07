import type { LabsChannel } from "@vase/contracts";

type LegacyChannel = {
  id: string;
  globalTenantId: string;
  tenantSlug: string;
  type: string;
  provider: string;
  accountLabel: string;
  externalHandle: string | null;
  providerAccountId: string | null;
};

const OFFICIAL_CHANNELS = new Set<LabsChannel>([
  "WHATSAPP",
  "INSTAGRAM",
  "FACEBOOK",
]);

export function buildLegacyOfficialChannelImport(channels: LegacyChannel[]) {
  return channels.flatMap((channel) => {
    if (
      channel.provider !== "META_OFFICIAL" ||
      !OFFICIAL_CHANNELS.has(channel.type as LabsChannel)
    ) {
      return [];
    }

    return [{
      legacyId: channel.id,
      globalTenantId: channel.globalTenantId,
      tenantSlug: channel.tenantSlug,
      type: channel.type as LabsChannel,
      providerAccountId: channel.providerAccountId,
      accountLabel: channel.accountLabel,
      externalHandle: channel.externalHandle,
      status: "PENDING" as const,
      lastError: "RECONNECT_OFFICIAL_META_REQUIRED",
      config: {
        migrationSource: "vase-app",
        reconnectRequired: true,
      },
    }];
  });
}
