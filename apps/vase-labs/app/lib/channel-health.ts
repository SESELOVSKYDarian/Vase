export type ChannelHealth = {
  webhookVerified: boolean;
  credentialsPresent: boolean;
  assetVerified: boolean;
  subscriptionActive: boolean;
};

function asConfig(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function hasMetaChannelCredentials(input: {
  secretKinds: readonly string[];
  config: unknown;
  fallbackAppId?: string | null;
  fallbackAppSecret?: string | null;
}) {
  const config = asConfig(input.config);
  const hasAccessToken = input.secretKinds.includes("META_ACCESS_TOKEN");
  const hasAppSecret = input.secretKinds.includes("META_APP_SECRET") || Boolean(input.fallbackAppSecret?.trim());
  const hasAppId = Boolean(
    (typeof config.metaAppId === "string" && config.metaAppId.trim())
    || input.fallbackAppId?.trim(),
  );
  return hasAccessToken && hasAppSecret && hasAppId;
}

export function isMetaAssetVerified(input: {
  providerAccountId?: string | null;
  config: unknown;
  lastError?: string | null;
}) {
  const config = asConfig(input.config);
  return Boolean(input.providerAccountId)
    && config.validationPending !== true
    && !input.lastError;
}

export function resolveChannelConnectionStatus(health: ChannelHealth): "CONNECTED" | "PENDING" {
  return health.webhookVerified && health.credentialsPresent && health.assetVerified && health.subscriptionActive
    ? "CONNECTED" : "PENDING";
}
