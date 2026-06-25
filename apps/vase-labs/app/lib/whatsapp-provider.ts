import { whatsappProviderConfigSchema, type WhatsAppProviderConfig } from "@vase/contracts";

export function readWhatsAppProviderConfig(config: unknown): WhatsAppProviderConfig {
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

  return whatsappProviderConfigSchema.parse({
    provider,
    accessToken: typeof source.accessToken === "string" ? source.accessToken : undefined,
    phoneNumberId: typeof source.phoneNumberId === "string" ? source.phoneNumberId : undefined,
    wabaId: typeof source.wabaId === "string" ? source.wabaId : undefined,
    appSecret: typeof source.appSecret === "string" ? source.appSecret : undefined,
    verifyToken: typeof source.verifyToken === "string" ? source.verifyToken : undefined,
    openwaBaseUrl: typeof source.openwaBaseUrl === "string" ? source.openwaBaseUrl : undefined,
    openwaApiKey: typeof source.openwaApiKey === "string" ? source.openwaApiKey : undefined,
    qrImageDataUrl: typeof source.qrImageDataUrl === "string" ? source.qrImageDataUrl : undefined,
    qrLastFetchedAt: typeof source.qrLastFetchedAt === "string" ? source.qrLastFetchedAt : undefined,
    connectionState: typeof source.connectionState === "string" ? source.connectionState : undefined,
    failureReason: typeof source.failureReason === "string" ? source.failureReason : undefined,
  });
}
