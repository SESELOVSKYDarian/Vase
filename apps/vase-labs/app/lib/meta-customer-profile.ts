import type { LabsChannel } from "@vase/contracts";
import { decryptChannelSecret } from "./channel-secrets";
import type { OfficialChannelSenderRepository } from "./official-channel-sender";

function profileText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function createMetaCustomerProfileResolver(input: {
  repository: OfficialChannelSenderRepository;
  encryptionSecret: string;
  graphVersion: string;
  fetcher?: typeof fetch;
}) {
  const fetcher = input.fetcher ?? fetch;
  return {
    async resolve(params: {
      globalTenantId: string;
      channelType: LabsChannel;
      userId: string;
    }): Promise<string | null> {
      if (!["INSTAGRAM", "FACEBOOK"].includes(params.channelType) || !input.encryptionSecret.trim()) return null;
      try {
        const context = await input.repository.findDeliveryContext({
          globalTenantId: params.globalTenantId,
          channelType: params.channelType,
        });
        if (!context) return null;
        const accessToken = decryptChannelSecret(context.encryptedAccessToken, input.encryptionSecret);
        const isInstagramLogin = params.channelType === "INSTAGRAM" && accessToken.startsWith("IG");
        const host = isInstagramLogin ? "https://graph.instagram.com" : "https://graph.facebook.com";
        const url = new URL(`${host}/${input.graphVersion}/${encodeURIComponent(params.userId)}`);
        url.searchParams.set(
          "fields",
          params.channelType === "FACEBOOK" ? "first_name,last_name" : "name,username",
        );
        const response = await fetcher(url, {
          headers: { authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) return null;
        const profile = await response.json().catch(() => ({})) as {
          name?: unknown;
          username?: unknown;
          first_name?: unknown;
          last_name?: unknown;
        };
        const firstName = profileText(profile.first_name);
        const lastName = profileText(profile.last_name);
        const facebookName = [firstName, lastName].filter(Boolean).join(" ").trim();
        if (params.channelType === "FACEBOOK") return facebookName || null;
        const name = profileText(profile.name);
        const username = profileText(profile.username);
        return name ?? (username ? `@${username.replace(/^@/, "")}` : null);
      } catch {
        return null;
      }
    },
  };
}
