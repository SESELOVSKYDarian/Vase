export type WhatsAppProvider = "META_OFFICIAL" | "OPENWA_UNOFFICIAL" | "BAILEYS_UNOFFICIAL";

export type WhatsAppChannelConfig = {
  provider: WhatsAppProvider;
  accessToken?: string;
  phoneNumberId?: string;
  appSecret?: string;
  verifyToken?: string;
  openwaBaseUrl?: string;
  openwaApiKey?: string;
  qrImageDataUrl?: string;
  qrLastFetchedAt?: string;
  connectionState?: string;
  failureReason?: string;
};

export function readWhatsAppProviderConfig(config: unknown): WhatsAppChannelConfig {
  if (!config || typeof config !== "object") {
    return { provider: "META_OFFICIAL" };
  }

  const source = config as Record<string, unknown>;
  const provider =
    source.provider === "OPENWA_UNOFFICIAL"
      ? "OPENWA_UNOFFICIAL"
      : source.provider === "BAILEYS_UNOFFICIAL"
        ? "BAILEYS_UNOFFICIAL"
        : "META_OFFICIAL";

  return {
    provider,
    accessToken: typeof source.accessToken === "string" ? source.accessToken : undefined,
    phoneNumberId: typeof source.phoneNumberId === "string" ? source.phoneNumberId : undefined,
    appSecret: typeof source.appSecret === "string" ? source.appSecret : undefined,
    verifyToken: typeof source.verifyToken === "string" ? source.verifyToken : undefined,
    openwaBaseUrl: typeof source.openwaBaseUrl === "string" ? source.openwaBaseUrl : undefined,
    openwaApiKey: typeof source.openwaApiKey === "string" ? source.openwaApiKey : undefined,
    qrImageDataUrl: typeof source.qrImageDataUrl === "string" ? source.qrImageDataUrl : undefined,
    qrLastFetchedAt: typeof source.qrLastFetchedAt === "string" ? source.qrLastFetchedAt : undefined,
    connectionState: typeof source.connectionState === "string" ? source.connectionState : undefined,
    failureReason: typeof source.failureReason === "string" ? source.failureReason : undefined,
  };
}
