export type ChannelHealth = {
  webhookVerified: boolean;
  credentialsPresent: boolean;
  assetVerified: boolean;
  subscriptionActive: boolean;
};

export function resolveChannelConnectionStatus(health: ChannelHealth): "CONNECTED" | "PENDING" {
  return health.webhookVerified && health.credentialsPresent && health.assetVerified && health.subscriptionActive
    ? "CONNECTED" : "PENDING";
}
