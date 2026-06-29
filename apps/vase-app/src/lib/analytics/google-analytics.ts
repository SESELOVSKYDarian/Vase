export const VASE_GOOGLE_ANALYTICS_ID = "G-NPD7PKWZ5G";

type GoogleAnalyticsRuntime = {
  appUrl?: string;
  nodeEnv?: string;
  requestHost?: string | null;
};

function normalizeHost(value: string | null | undefined) {
  const trimmed = value?.trim().toLowerCase();

  if (!trimmed) {
    return null;
  }

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return new URL(trimmed).hostname;
    }
  } catch {
    return null;
  }

  return trimmed.replace(/\/+$/, "").split(":")[0] || null;
}

export function shouldLoadVaseGoogleAnalytics({
  appUrl = process.env.NEXT_PUBLIC_APP_URL,
  nodeEnv = process.env.NODE_ENV,
  requestHost,
}: GoogleAnalyticsRuntime = {}) {
  if (nodeEnv !== "production") {
    return false;
  }

  const host = normalizeHost(requestHost) ?? normalizeHost(appUrl);

  return host === "vase.ar" || host === "www.vase.ar";
}
