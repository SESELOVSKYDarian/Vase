import type { AiChannelStatus } from "@prisma/client";

type MetaOfficialChannelConfig = {
  provider: "META_OFFICIAL";
  accessToken?: string;
  phoneNumberId?: string;
  appSecret?: string;
  verifyToken?: string;
};

function clean(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function readExistingConfigValue(config: Record<string, unknown> | undefined, key: keyof MetaOfficialChannelConfig) {
  const value = config?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export function buildMetaOfficialChannelConfig(input: {
  existingConfig?: Record<string, unknown>;
  accessToken?: string;
  phoneNumberId?: string;
  appSecret?: string;
  verifyToken?: string;
}): MetaOfficialChannelConfig {
  return {
    provider: "META_OFFICIAL",
    accessToken: clean(input.accessToken) ?? readExistingConfigValue(input.existingConfig, "accessToken"),
    phoneNumberId: clean(input.phoneNumberId) ?? readExistingConfigValue(input.existingConfig, "phoneNumberId"),
    appSecret: clean(input.appSecret) ?? readExistingConfigValue(input.existingConfig, "appSecret"),
    verifyToken: clean(input.verifyToken) ?? readExistingConfigValue(input.existingConfig, "verifyToken"),
  };
}

export function getMetaOfficialChannelStatus(config: MetaOfficialChannelConfig): AiChannelStatus {
  return config.accessToken && config.phoneNumberId && config.appSecret ? "CONNECTED" : "PENDING";
}
