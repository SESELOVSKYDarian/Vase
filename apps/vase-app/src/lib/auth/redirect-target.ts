type RedirectTargetOptions = {
  fallback?: string;
  nodeEnv?: string;
};

function isVaseHostname(hostname: string) {
  const normalizedHostname = hostname.toLowerCase();
  return normalizedHostname === "vase.ar" || normalizedHostname.endsWith(".vase.ar");
}

function isLocalDevelopmentUrl(url: URL, nodeEnv: string | undefined) {
  return (
    nodeEnv !== "production"
    && url.protocol === "http:"
    && (url.hostname === "localhost" || url.hostname === "127.0.0.1")
  );
}

export function normalizeVaseRedirectTarget(
  value: unknown,
  options: RedirectTargetOptions = {},
) {
  const fallback = options.fallback ?? "/app";
  const rawValue = typeof value === "string" ? value.trim() : "";

  if (!rawValue) return fallback;
  if (
    rawValue.startsWith("/")
    && !rawValue.startsWith("//")
    && !rawValue.startsWith("/\\")
  ) {
    return rawValue;
  }

  let url: URL;
  try {
    url = new URL(rawValue);
  } catch {
    return fallback;
  }

  if (url.username || url.password) return fallback;
  if (url.protocol === "https:" && isVaseHostname(url.hostname)) return rawValue;
  if (isLocalDevelopmentUrl(url, options.nodeEnv ?? process.env.NODE_ENV)) return rawValue;

  return fallback;
}
