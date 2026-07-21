import { labsPrisma } from "../app/lib/db";
import { buildLegacyOfficialChannelImport } from "../app/lib/legacy-channel-migration";
import { getDefaultOpenAiModel } from "../app/lib/openai-reply-generator";

async function main() {
  const appInternalUrl = process.env.APP_INTERNAL_URL?.trim();
  const serviceToken = process.env.SERVICE_TO_SERVICE_TOKEN?.trim();
  if (!appInternalUrl || !serviceToken) {
    throw new Error("APP_INTERNAL_URL_AND_SERVICE_TO_SERVICE_TOKEN_REQUIRED");
  }

  const response = await fetch(
    new URL("/api/internal/labs/channels/migration", appInternalUrl),
    { headers: { authorization: `Bearer ${serviceToken}` } },
  );
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !Array.isArray(payload.channels)) {
    throw new Error("LEGACY_CHANNEL_EXPORT_FAILED");
  }

  const channels = buildLegacyOfficialChannelImport(payload.channels);
  for (const channel of channels) {
    const assistant = await labsPrisma.assistant.upsert({
      where: { tenantSlug: channel.tenantSlug },
      create: {
        globalTenantId: channel.globalTenantId,
        tenantSlug: channel.tenantSlug,
        name: `${channel.tenantSlug} Assistant`,
        model: getDefaultOpenAiModel(),
      },
      update: { globalTenantId: channel.globalTenantId },
    });
    const providerAccountId =
      channel.providerAccountId ?? `legacy:${channel.legacyId}`;

    await labsPrisma.channel.upsert({
      where: {
        assistantId_type_providerAccountId: {
          assistantId: assistant.id,
          type: channel.type,
          providerAccountId,
        },
      },
      create: {
        id: channel.legacyId,
        assistantId: assistant.id,
        type: channel.type,
        provider: "META_OFFICIAL",
        status: "PENDING",
        providerAccountId,
        accountLabel: channel.accountLabel,
        externalHandle: channel.externalHandle,
        config: channel.config,
        lastError: channel.lastError,
      },
      update: {
        accountLabel: channel.accountLabel,
        externalHandle: channel.externalHandle,
        config: channel.config,
        status: "PENDING",
        lastError: channel.lastError,
      },
    });
  }

  console.log(JSON.stringify({ imported: channels.length }));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "LEGACY_CHANNEL_MIGRATION_FAILED");
    process.exitCode = 1;
  })
  .finally(async () => {
    await labsPrisma.$disconnect();
  });
