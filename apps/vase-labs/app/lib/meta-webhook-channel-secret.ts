import type { LabsChannel } from "@vase/contracts";
import { decryptChannelSecret } from "./channel-secrets";

type SecretRepository = {
  channelSecret: {
    findFirst(input: unknown): Promise<{ encryptedValue: string } | null>;
  };
};

export async function resolveMetaWebhookAppSecret(input: {
  prisma: SecretRepository;
  tenantSlug: string;
  channelType: LabsChannel;
  env?: NodeJS.ProcessEnv;
}): Promise<string | undefined> {
  const env = input.env ?? process.env;
  const stored = await input.prisma.channelSecret.findFirst({
    where: {
      kind: "META_APP_SECRET",
      channel: {
        type: input.channelType,
        provider: "META_OFFICIAL",
        assistant: { tenantSlug: input.tenantSlug },
      },
    },
    orderBy: { updatedAt: "desc" },
    select: { encryptedValue: true },
  });

  if (stored?.encryptedValue) {
    const encryptionSecret = env.TOKEN_ENCRYPTION_SECRET?.trim();
    if (!encryptionSecret) throw new Error("TOKEN_ENCRYPTION_SECRET_MISSING");
    return decryptChannelSecret(stored.encryptedValue, encryptionSecret);
  }

  return env.META_APP_SECRET?.trim() || undefined;
}
