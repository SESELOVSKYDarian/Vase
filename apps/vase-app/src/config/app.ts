function getTrustedOrigins() {
  const configured = process.env.TRUSTED_ORIGINS
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (configured?.length) {
    return configured;
  }

  return process.env.NODE_ENV === "production"
    ? [
        "https://app.vase.ar",
        "https://vase.ar",
        "https://business.vase.ar",
        "https://labs.vase.ar",
        "https://api.vase.ar",
      ]
    : ["http://localhost:3002", "http://127.0.0.1:3002"];
}

export const appConfig = {
  name: "Vase",
  description:
    "Plataforma SaaS multi-tenant para operaciones, experiencia y crecimiento de negocios modernos.",
  company: "Vase Labs",
  supportEmail: "security@vase.ar",
  locales: ["es", "en"] as const,
  defaultLocale: "es" as const,
  security: {
    trustedOrigins: getTrustedOrigins(),
    rateLimitWindowSeconds: 60,
    rateLimitMaxRequests: 30,
    uploadMaxFileSizeMb: Number(process.env.UPLOAD_MAX_FILE_SIZE_MB ?? 10),
    uploadScanMode: process.env.UPLOAD_SCAN_MODE ?? "report_only",
    malwareScanUrl: process.env.MALWARE_SCAN_URL ?? "",
    malwareScanToken: process.env.MALWARE_SCAN_TOKEN ?? "",
    storageBucket: process.env.STORAGE_BUCKET ?? "vase-private",
    authSessionMaxAgeSeconds: 60 * 60 * 24 * 7,
    shortSessionMaxAgeSeconds: 60 * 60 * 24,
    rememberSessionMaxAgeSeconds: 60 * 60 * 24 * 7,
    privilegedSessionMaxAgeSeconds: 60 * 60 * 8,
    emailVerificationHours: 24,
    passwordResetMinutes: 30,
    loginMaxFailedAttemptsPerDay: Number(process.env.LOGIN_MAX_FAILED_ATTEMPTS_PER_DAY ?? 8),
    loginAutoLockHours: Number(process.env.LOGIN_AUTO_LOCK_HOURS ?? 24),
    integrationRequestBodyMaxBytes: 1024 * 1024,
    webhookTimeoutMs: 8000,
    secretRotationDays: 90,
  },
  featureFlags: {
    payments: false,
    experiments: true,
  },
} as const;

export type AppLocale = (typeof appConfig.locales)[number];
