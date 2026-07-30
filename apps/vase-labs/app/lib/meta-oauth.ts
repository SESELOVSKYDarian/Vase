import { createHmac, timingSafeEqual } from "node:crypto";
import type { LabsChannel, MetaConnectStartResult } from "@vase/contracts";

const DEFAULT_GRAPH_VERSION = "v20.0";
const DEFAULT_EXPIRES_MS = 10 * 60 * 1000;

const CHANNEL_SCOPES: Record<LabsChannel, string[]> = {
  WHATSAPP: ["business_management", "whatsapp_business_management", "whatsapp_business_messaging"],
  INSTAGRAM: ["pages_show_list", "pages_read_engagement", "instagram_basic", "instagram_manage_messages", "pages_manage_metadata"],
  FACEBOOK: ["pages_show_list", "pages_read_engagement", "pages_messaging", "pages_manage_metadata"],
};

interface MetaOAuthServiceInput {
  appId: string;
  appSecret: string;
  redirectUri: string;
  stateSecret: string;
  whatsappConfigId?: string;
  graphVersion?: string;
  now?: () => Date;
  fetcher?: typeof fetch;
}

export interface MetaOAuthStatePayload {
  attemptId: string;
  globalUserId: string;
  globalTenantId: string;
  tenantSlug: string;
  channelType: LabsChannel;
  expiresAt: string;
}

function base64urlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function createMetaOAuthService(input: MetaOAuthServiceInput) {
  const now = input.now ?? (() => new Date());
  const graphVersion = input.graphVersion ?? DEFAULT_GRAPH_VERSION;

  return {
    createAuthorizationUrl(request: Omit<MetaOAuthStatePayload, "expiresAt">): MetaConnectStartResult {
      const scopes = CHANNEL_SCOPES[request.channelType];
      const expiresAt = new Date(now().getTime() + DEFAULT_EXPIRES_MS).toISOString();
      const payload = base64urlJson({ ...request, expiresAt });
      const state = `${payload}.${sign(payload, input.stateSecret)}`;
      const url = new URL(`https://www.facebook.com/${graphVersion}/dialog/oauth`);
      url.searchParams.set("client_id", input.appId);
      url.searchParams.set("redirect_uri", input.redirectUri);
      url.searchParams.set("state", state);
      url.searchParams.set("scope", scopes.join(","));
      url.searchParams.set("response_type", "code");
      if (request.channelType === "WHATSAPP" && input.whatsappConfigId) {
        url.searchParams.set("config_id", input.whatsappConfigId);
        url.searchParams.set("override_default_response_type", "true");
      }

      return {
        authorizationUrl: url.toString(),
        state,
        expiresAt,
        scopes,
      };
    },

    verifyState(state: string): MetaOAuthStatePayload {
      const [payload, signature] = state.split(".");
      if (!payload || !signature || !safeEqual(signature, sign(payload, input.stateSecret))) {
        throw new Error("INVALID_META_OAUTH_STATE");
      }

      const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as MetaOAuthStatePayload;
      if (new Date(decoded.expiresAt).getTime() < now().getTime()) {
        throw new Error("META_OAUTH_STATE_EXPIRED");
      }

      return decoded;
    },

    async exchangeCodeForAccessToken(code: string, channelType: LabsChannel) {
      const fetcher = input.fetcher ?? fetch;
      const url = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
      url.searchParams.set("client_id", input.appId);
      url.searchParams.set("client_secret", input.appSecret);
      url.searchParams.set("redirect_uri", input.redirectUri);
      url.searchParams.set("code", code);
      const response = await fetcher(url);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || typeof payload.access_token !== "string") {
        throw new Error(typeof payload.error?.message === "string" ? payload.error.message : "META_OAUTH_EXCHANGE_FAILED");
      }

      if (channelType === "FACEBOOK" || channelType === "INSTAGRAM") {
        const longLivedUrl = new URL(
          `https://graph.facebook.com/${graphVersion}/oauth/access_token`,
        );
        longLivedUrl.searchParams.set("grant_type", "fb_exchange_token");
        longLivedUrl.searchParams.set("client_id", input.appId);
        longLivedUrl.searchParams.set("client_secret", input.appSecret);
        longLivedUrl.searchParams.set("fb_exchange_token", payload.access_token);
        const longLivedResponse = await fetcher(longLivedUrl);
        const longLivedPayload = await longLivedResponse.json().catch(() => ({}));
        if (
          !longLivedResponse.ok
          || typeof longLivedPayload.access_token !== "string"
        ) {
          throw new Error("META_LONG_LIVED_TOKEN_EXCHANGE_FAILED");
        }
        return {
          accessToken: longLivedPayload.access_token as string,
          tokenType: typeof longLivedPayload.token_type === "string"
            ? longLivedPayload.token_type
            : null,
          expiresIn: typeof longLivedPayload.expires_in === "number"
            ? longLivedPayload.expires_in
            : null,
        };
      }

      return {
        accessToken: payload.access_token as string,
        tokenType: typeof payload.token_type === "string" ? payload.token_type : null,
        expiresIn: typeof payload.expires_in === "number" ? payload.expires_in : null,
      };
    },
  };
}
