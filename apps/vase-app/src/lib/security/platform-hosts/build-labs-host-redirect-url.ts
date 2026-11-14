// Parte de platform-hosts.ts: PlatformHostsInput, LABS_HOME_PATH, AUTH_PATHS, PUBLIC_MARKETING_PATHS, EditorHostInput, normalizeHostCandidate y más.

export type PlatformHostsInput = {
  nodeEnv?: string;
  appUrl?: string;
  trustedOrigins?: string | string[];
  labsHost?: string;
  primaryHost?: string;
};

export const LABS_HOME_PATH = "/app/owner/labs";

export const AUTH_PATHS = [
  "/signin",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
] as const;

export const PUBLIC_MARKETING_PATHS = [
  "/demo",
  "/developers/api",
  "/developers/docs",
  "/integraciones",
  "/politica-de-privacidad",
  "/precios",
  "/preguntas-frecuentes",
  "/que-es-vase",
  "/seguridad",
  "/terminos-y-condiciones",
  "/vase-business",
  "/vaselabs",
] as const;

export type EditorHostInput = {
  nodeEnv?: string;
  editorUrl?: string;
};

export function normalizeHostCandidate(value: string) {
  const trimmed = value.trim().toLowerCase().replace(/\.+$/, "");

  if (!trimmed) {
    return null;
  }

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return new URL(trimmed).host.toLowerCase();
    }
  } catch {
    return null;
  }

  return trimmed.replace(/\/+$/, "");
}

export function readHostsFromValue(value?: string | string[]) {
  if (!value) {
    return [];
  }

  const rawValues = Array.isArray(value) ? value : value.split(",");
  const hosts = rawValues
    .map((entry) => normalizeHostCandidate(entry))
    .filter((entry): entry is string => Boolean(entry));

  return Array.from(new Set(hosts));
}

export function getConfiguredHostValues(input: PlatformHostsInput) {
  return [input.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "", ...readHostsFromValue(input.trustedOrigins ?? process.env.TRUSTED_ORIGINS)];
}

export function normalizeComparableHost(value: string, nodeEnv: string | undefined) {
  const normalized = normalizeHostCandidate(value);

  if (!normalized) {
    return "";
  }

  if (nodeEnv === "production" && normalized.includes(":") && !normalized.startsWith("[")) {
    return normalized.split(":")[0] ?? normalized;
  }

  return normalized;
}

export function resolvePlatformHosts(input: PlatformHostsInput = {}) {
  const {
    nodeEnv = process.env.NODE_ENV,
  } = input;
  const defaults =
    nodeEnv === "production"
      ? ["app.vase.ar", "admin.vase.ar", "vase.ar", "www.vase.ar"]
      : ["localhost:3002"];
  const hosts = new Set(defaults);

  for (const host of readHostsFromValue(getConfiguredHostValues(input))) {
    hosts.add(host);
  }

  return Array.from(hosts);
}

export function isPlatformHost(hostname: string, input: PlatformHostsInput = {}) {
  const nodeEnv = input.nodeEnv ?? process.env.NODE_ENV;
  return resolvePlatformHosts(input).includes(normalizeComparableHost(hostname, nodeEnv));
}

export function resolveRequestHostname({
  forwardedHost,
  host,
  originalHost,
  forwardedServer,
  urlHost,
  nodeEnv = process.env.NODE_ENV,
}: {
  forwardedHost?: string | null;
  host?: string | null;
  originalHost?: string | null;
  forwardedServer?: string | null;
  urlHost?: string | null;
  nodeEnv?: string;
}) {
  const candidates = [forwardedHost, originalHost, host, forwardedServer, urlHost]
    .flatMap((value) => value?.split(",") ?? [])
    .map((value) => normalizeComparableHost(value, nodeEnv))
    .filter(Boolean);
  const knownHosts = new Set(resolvePlatformHosts({ nodeEnv }));

  return candidates.find((candidate) => knownHosts.has(candidate)) ?? candidates[0] ?? "";
}

export function resolveLabsHosts(input: PlatformHostsInput = {}) {
  const { nodeEnv = process.env.NODE_ENV, labsHost = process.env.VASE_LABS_HOST } = input;
  const hosts = new Set(nodeEnv === "production" ? ["labs.vase.ar"] : []);

  for (const host of readHostsFromValue([labsHost ?? "", ...getConfiguredHostValues(input)])) {
    if (host === "labs.vase.ar" || host.startsWith("labs.")) {
      hosts.add(host);
    }
  }

  return Array.from(hosts);
}

export function isLabsHost(hostname: string, input: PlatformHostsInput = {}) {
  const nodeEnv = input.nodeEnv ?? process.env.NODE_ENV;
  return resolveLabsHosts(input).includes(normalizeComparableHost(hostname, nodeEnv));
}

export function isLabsWorkspacePath(pathname: string) {
  return (
    pathname === "/app/labs" ||
    pathname.startsWith("/app/labs/") ||
    pathname === "/app/owner/labs" ||
    pathname.startsWith("/app/owner/labs/")
  );
}

export function resolveLabsRedirectHost(input: PlatformHostsInput = {}) {
  return resolveLabsHosts(input)[0] ?? null;
}

export function resolvePrimaryPlatformHost(input: PlatformHostsInput = {}) {
  const { nodeEnv = process.env.NODE_ENV, primaryHost = process.env.VASE_PRIMARY_HOST } = input;
  const configuredHost = normalizeHostCandidate(primaryHost ?? "");

  if (configuredHost) {
    return configuredHost;
  }

  return nodeEnv === "production" ? "app.vase.ar" : "localhost:3002";
}

export function buildDefaultPlatformRedirectUrl({
  hostname,
  url,
  input = {},
}: {
  hostname: string;
  url: string;
  input?: PlatformHostsInput;
}) {
  const normalizedHost = normalizeComparableHost(
    hostname,
    input.nodeEnv ?? process.env.NODE_ENV,
  );
  if (normalizedHost !== resolvePrimaryPlatformHost(input)) {
    return null;
  }

  const redirectUrl = new URL(url);
  if (redirectUrl.pathname !== "/") {
    return null;
  }

  redirectUrl.pathname = "/app";
  redirectUrl.search = "";
  return redirectUrl.toString();
}

export function buildLabsHostRedirectUrl({
  hostname,
  url,
  input = {},
}: {
  hostname: string;
  url: string;
  input?: PlatformHostsInput;
}) {
  const redirectUrl = new URL(url);

  if (!isLabsWorkspacePath(redirectUrl.pathname) || isLabsHost(hostname, input)) {
    return null;
  }

  const labsHost = resolveLabsRedirectHost(input);
  if (!labsHost) {
    return null;
  }

  redirectUrl.host = labsHost;
  if ((input.nodeEnv ?? process.env.NODE_ENV) === "production") {
    redirectUrl.protocol = "https:";
    redirectUrl.port = "";
  }

  if (
    redirectUrl.pathname === "/app/labs" ||
    redirectUrl.pathname.startsWith("/app/labs/")
  ) {
    redirectUrl.pathname = LABS_HOME_PATH;
    redirectUrl.search = "";
    redirectUrl.hash = "";
  }

  return redirectUrl.toString();
}

export function isAllowedLabsApiPath(pathname: string) {
  return (
    pathname === "/api/health/live" ||
    pathname === "/api/health/ready" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/labs/inbox" ||
    pathname.startsWith("/api/labs/")
  );
}
