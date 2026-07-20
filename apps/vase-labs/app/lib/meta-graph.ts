import type { LabsChannel } from "@vase/contracts";
import type { DiscoveredMetaAsset } from "./meta-connection-service";

type GraphPayload = Record<string, unknown>;

const REQUIRED_SCOPES: Record<LabsChannel, string[]> = {
  WHATSAPP: ["whatsapp_business_management", "whatsapp_business_messaging"],
  INSTAGRAM: ["instagram_manage_messages", "pages_manage_metadata"],
  FACEBOOK: ["pages_messaging", "pages_manage_metadata"],
};

const SUBSCRIBED_FIELDS: Record<LabsChannel, string[]> = {
  WHATSAPP: ["messages"],
  INSTAGRAM: ["messages", "messaging_postbacks", "messaging_seen", "message_reactions"],
  FACEBOOK: ["messages", "messaging_postbacks", "message_deliveries", "message_reads"],
};

function asRecord(value: unknown): GraphPayload {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as GraphPayload)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function createMetaGraphClient(input: {
  graphVersion: string;
  appId: string;
  appSecret: string;
  fetcher?: typeof fetch;
}) {
  const fetcher = input.fetcher ?? fetch;
  const graphBase = `https://graph.facebook.com/${input.graphVersion}`;

  async function graphRequest(
    path: string,
    accessToken: string,
    init?: RequestInit,
    fallbackError = "META_GRAPH_REQUEST_FAILED",
  ): Promise<GraphPayload> {
    const response = await fetcher(`${graphBase}${path}`, {
      ...init,
      headers: {
        accept: "application/json",
        authorization: `Bearer ${accessToken}`,
        ...(init?.headers ?? {}),
      },
    });
    const payload = asRecord(await response.json().catch(() => ({})));
    if (!response.ok || payload.error) {
      const providerError = asRecord(payload.error);
      if (providerError.code === 190) throw new Error("META_TOKEN_INVALID");
      if (fallbackError === "META_SUBSCRIPTION_FAILED") throw new Error(fallbackError);
      if (providerError.code === 10 || providerError.code === 200) throw new Error("META_PERMISSIONS_MISSING");
      throw new Error(fallbackError);
    }
    return payload;
  }

  async function discoverPageAssets(
    channelType: Extract<LabsChannel, "FACEBOOK" | "INSTAGRAM">,
    accessToken: string,
  ): Promise<DiscoveredMetaAsset[]> {
    const payload = await graphRequest(
      "/me/accounts?fields=id,name,username,access_token,instagram_business_account{id,name,username}",
      accessToken,
    );

    const assets: DiscoveredMetaAsset[] = [];
    for (const item of asArray(payload.data)) {
      const page = asRecord(item);
      const pageId = stringValue(page.id);
      const pageName = stringValue(page.name);
      const pageToken = stringValue(page.access_token);
      if (!pageId || !pageName || !pageToken) continue;

      if (channelType === "FACEBOOK") {
        const username = stringValue(page.username);
        assets.push({
          candidate: {
            id: pageId,
            kind: "FACEBOOK_PAGE" as const,
            name: pageName,
            ...(username ? { handle: `@${username}` } : {}),
          },
          accessToken: pageToken,
        });
        continue;
      }

      const instagram = asRecord(page.instagram_business_account);
      const instagramId = stringValue(instagram.id);
      if (!instagramId) continue;
      const username = stringValue(instagram.username);

      assets.push({
        candidate: {
          id: instagramId,
          kind: "INSTAGRAM_ACCOUNT" as const,
          name: stringValue(instagram.name) ?? pageName,
          ...(username ? { handle: `@${username}` } : {}),
          parentId: pageId,
        },
        accessToken: pageToken,
        parentId: pageId,
      });
    }
    return assets;
  }

  async function discoverWhatsAppAssets(accessToken: string): Promise<DiscoveredMetaAsset[]> {
    const payload = await graphRequest(
      "/me/businesses?fields=id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name}}",
      accessToken,
    );

    return asArray(payload.data).flatMap((businessValue) => {
      const business = asRecord(businessValue);
      const accounts = asRecord(business.owned_whatsapp_business_accounts);

      return asArray(accounts.data).flatMap((accountValue) => {
        const account = asRecord(accountValue);
        const wabaId = stringValue(account.id);
        const phones = asRecord(account.phone_numbers);
        if (!wabaId) return [];

        return asArray(phones.data).flatMap((phoneValue) => {
          const phone = asRecord(phoneValue);
          const phoneId = stringValue(phone.id);
          if (!phoneId) return [];
          const displayPhone = stringValue(phone.display_phone_number);

          return [{
            candidate: {
              id: phoneId,
              kind: "WHATSAPP_PHONE" as const,
              name:
                stringValue(phone.verified_name) ??
                stringValue(account.name) ??
                stringValue(business.name) ??
                displayPhone ??
                "WhatsApp Business",
              ...(displayPhone ? { handle: displayPhone } : {}),
              parentId: wabaId,
            },
            parentId: wabaId,
          }];
        });
      });
    });
  }

  async function debugToken(accessToken: string, channelType: LabsChannel) {
    const url = new URL(`${graphBase}/debug_token`);
    url.searchParams.set("input_token", accessToken);
    url.searchParams.set("access_token", `${input.appId}|${input.appSecret}`);
    const response = await fetcher(url, { headers: { accept: "application/json" } });
    const payload = asRecord(await response.json().catch(() => ({})));
    const data = asRecord(payload.data);
    const scopes = new Set(asArray(data.scopes).filter((scope): scope is string => typeof scope === "string"));

    if (!response.ok || data.is_valid !== true || data.app_id !== input.appId) {
      throw new Error("META_TOKEN_INVALID");
    }
    if (REQUIRED_SCOPES[channelType].some((scope) => !scopes.has(scope))) {
      throw new Error("META_PERMISSIONS_MISSING");
    }
  }

  return {
    async resolveManualAsset(params: {
      channelType: LabsChannel;
      accessToken: string;
      providerAccountId: string;
      parentId: string | null;
    }): Promise<DiscoveredMetaAsset> {
      if (params.channelType === "WHATSAPP") {
        if (!params.parentId) throw new Error("META_ASSET_PARENT_MISSING");
        const payload = await graphRequest(
          `/${encodeURIComponent(params.parentId)}/phone_numbers?fields=id,display_phone_number,verified_name`,
          params.accessToken,
          undefined,
          "META_ASSET_NOT_AUTHORIZED",
        );
        const phone = asArray(payload.data).map(asRecord).find((item) => stringValue(item.id) === params.providerAccountId);
        if (!phone) throw new Error("META_ASSET_NOT_AUTHORIZED");
        const displayPhone = stringValue(phone.display_phone_number);
        return {
          candidate: {
            id: params.providerAccountId,
            kind: "WHATSAPP_PHONE",
            name: stringValue(phone.verified_name) ?? displayPhone ?? "WhatsApp Business",
            ...(displayPhone ? { handle: displayPhone } : {}),
            parentId: params.parentId,
          },
          parentId: params.parentId,
        };
      }

      const pageId = params.channelType === "FACEBOOK" ? params.providerAccountId : params.parentId;
      if (!pageId) throw new Error("META_ASSET_PARENT_MISSING");
      const page = await graphRequest(
        `/${encodeURIComponent(pageId)}?fields=id,name,username,instagram_business_account{id,name,username}`,
        params.accessToken,
        undefined,
        "META_ASSET_NOT_AUTHORIZED",
      );
      if (stringValue(page.id) !== pageId) throw new Error("META_ASSET_NOT_AUTHORIZED");
      const pageName = stringValue(page.name) ?? "Facebook Page";
      if (params.channelType === "FACEBOOK") {
        const username = stringValue(page.username);
        return { candidate: { id: pageId, kind: "FACEBOOK_PAGE", name: pageName, ...(username ? { handle: `@${username}` } : {}) }, accessToken: params.accessToken };
      }
      const instagram = asRecord(page.instagram_business_account);
      if (stringValue(instagram.id) !== params.providerAccountId) throw new Error("META_ASSET_NOT_AUTHORIZED");
      const username = stringValue(instagram.username);
      return {
        candidate: { id: params.providerAccountId, kind: "INSTAGRAM_ACCOUNT", name: stringValue(instagram.name) ?? pageName, ...(username ? { handle: `@${username}` } : {}), parentId: pageId },
        parentId: pageId,
        accessToken: params.accessToken,
      };
    },

    async testConnection(params: {
      channelType: LabsChannel;
      accessToken: string;
    }) {
      await debugToken(params.accessToken, params.channelType);
      return { ok: true as const };
    },

    async discoverAssets(params: {
      channelType: LabsChannel;
      accessToken: string;
    }): Promise<DiscoveredMetaAsset[]> {
      return params.channelType === "WHATSAPP"
        ? discoverWhatsAppAssets(params.accessToken)
        : discoverPageAssets(params.channelType, params.accessToken);
    },

    async verifyAndSubscribe(params: {
      channelType: LabsChannel;
      asset: DiscoveredMetaAsset;
      userAccessToken: string;
    }) {
      const accessToken = params.asset.accessToken ?? params.userAccessToken;
      await debugToken(accessToken, params.channelType);

      const subscriptionTarget =
        params.channelType === "WHATSAPP"
          ? params.asset.parentId
          : params.asset.candidate.id;
      if (!subscriptionTarget) {
        throw new Error("META_ASSET_PARENT_MISSING");
      }

      const fields = SUBSCRIBED_FIELDS[params.channelType].join(",");
      const subscriptionPath = params.channelType === "WHATSAPP"
        ? `/${encodeURIComponent(subscriptionTarget)}/subscribed_apps`
        : `/${encodeURIComponent(subscriptionTarget)}/subscribed_apps?subscribed_fields=${encodeURIComponent(fields)}`;
      await graphRequest(
        subscriptionPath,
        accessToken,
        { method: "POST" },
        "META_SUBSCRIPTION_FAILED",
      );

      return {
        providerAccountId: params.asset.candidate.id,
        accountLabel: params.asset.candidate.name,
        externalHandle: params.asset.candidate.handle ?? null,
        config: {
          parentId: params.asset.parentId ?? params.asset.candidate.parentId ?? null,
          subscribedFields: SUBSCRIBED_FIELDS[params.channelType],
          graphVersion: input.graphVersion,
        },
        accessToken,
      };
    },
  };
}
