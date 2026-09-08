import type { LabsChannel } from "@vase/contracts";

export type InstagramAuthMode = "INSTAGRAM_LOGIN" | "FACEBOOK_LOGIN";

export function isInstagramLoginAccessToken(accessToken: string | null | undefined) {
  return Boolean(accessToken?.trim().startsWith("IG"));
}

export function resolveInstagramAuthMode(accessToken: string | null | undefined): InstagramAuthMode {
  return isInstagramLoginAccessToken(accessToken) ? "INSTAGRAM_LOGIN" : "FACEBOOK_LOGIN";
}

export function resolveMetaGraphHost(channelType: LabsChannel, accessToken: string) {
  return channelType === "INSTAGRAM" && isInstagramLoginAccessToken(accessToken)
    ? "https://graph.instagram.com"
    : "https://graph.facebook.com";
}

export function requiresParentAsset(channelType: LabsChannel, accessToken: string) {
  return channelType === "WHATSAPP" || (channelType === "INSTAGRAM" && !isInstagramLoginAccessToken(accessToken));
}
