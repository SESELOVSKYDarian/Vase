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

const META_ASSET_ERROR_CODES = new Set([
  "META_ASSET_NOT_AUTHORIZED",
  "META_ASSET_PARENT_MISSING",
  "META_TOKEN_INVALID",
  "META_PERMISSIONS_MISSING",
]);

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
  const errorCode = input.lastError?.split(":", 1)[0]?.trim();
  return Boolean(input.providerAccountId)
    && config.validationPending !== true
    && !META_ASSET_ERROR_CODES.has(errorCode ?? "");
}

export function hasMessagingPermission(configValue: unknown) {
  const config = asConfig(configValue);
  return config.messagingPermissionVerified !== false
    && Array.isArray(config.subscribedFields)
    && config.subscribedFields.includes("messages");
}

export type MetaAssetValidationState = "VALID" | "PENDING" | "MISSING" | "NOT_AUTHORIZED";
export function resolveMetaAssetValidationState(input: { providerAccountId?: string | null; config: unknown; currentError?: string | null }): MetaAssetValidationState {
  const config = asConfig(input.config);
  if (!input.providerAccountId) return "MISSING";
  if (input.currentError === "META_ASSET_NOT_AUTHORIZED") return "NOT_AUTHORIZED";
  return config.validationPending === true ? "PENDING" : "VALID";
}

export function resolveChannelConnectionStatus(health: ChannelHealth): "CONNECTED" | "PENDING" {
  return health.webhookVerified && health.credentialsPresent && health.assetVerified && health.subscriptionActive
    ? "CONNECTED" : "PENDING";
}

export function channelNeedsAttention(input: { status: string; health: ChannelHealth }) {
  return input.status === "ERROR";
}

export function resolveOperationalChannelStatus(input: {
  persistedStatus: string;
  health: ChannelHealth;
  messagingPermission: boolean;
}) {
  if (input.persistedStatus === "ERROR") return "ERROR";
  return resolveChannelConnectionStatus(input.health) === "CONNECTED" && input.messagingPermission
    ? "CONNECTED"
    : "PENDING";
}

export function channelHasPendingSetup(input: { status: string; health: ChannelHealth }) {
  return input.status === "PENDING" || (input.status !== "ERROR" && Object.values(input.health).some((value) => !value));
}
