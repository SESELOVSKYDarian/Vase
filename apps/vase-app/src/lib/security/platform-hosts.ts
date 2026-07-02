import { productOrigins } from "@/config/origins";

type PlatformHostsInput = {
  nodeEnv?: string;
  appUrl?: string;
  trustedOrigins?: string | string[];
  labsHost?: string;
  primaryHost?: string;
};

export const LABS_HOME_PATH = "/app/owner/labs";

const AUTH_PATHS = [
  "/signin",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
] as const;

const PUBLIC_MARKETING_PATHS = [
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

type EditorHostInput = {
  nodeEnv?: string;
  editorUrl?: string;
};

function normalizeHostCandidate(value: string) {
  const trimmed = value.trim().toLowerCase();

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

function readHostsFromValue(value?: string | string[]) {
  if (!value) {
    return [];
  }

  const rawValues = Array.isArray(value) ? value : value.split(",");
  const hosts = rawValues
    .map((entry) => normalizeHostCandidate(entry))
    .filter((entry): entry is string => Boolean(entry));

  return Array.from(new Set(hosts));
}

function getConfiguredHostValues(input: PlatformHostsInput) {
  return [input.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "", ...readHostsFromValue(input.trustedOrigins ?? process.env.TRUSTED_ORIGINS)];
}

function normalizeComparableHost(value: string, nodeEnv: string | undefined) {
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
      ? ["app.vase.ar", "vase.ar", "www.vase.ar"]
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

function isAllowedLabsApiPath(pathname: string) {
  return (
    pathname === "/api/health/live" ||
    pathname === "/api/health/ready" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/labs/inbox" ||
    pathname.startsWith("/api/labs/")
  );
}

export function resolveLabsHostRequest({
  hostname,
  url,
  input = {},
}: {
  hostname: string;
  url: string;
  input?: PlatformHostsInput;
}):
  | { type: "allow" }
  | { type: "redirect"; url: string }
  | { type: "reject"; status: 404 } {
  if (!isLabsHost(hostname, input)) {
    return { type: "allow" };
  }

  const target = new URL(url);

  if (isLabsWorkspacePath(target.pathname)) {
    if (
      target.pathname === "/app/labs" ||
      target.pathname.startsWith("/app/labs/")
    ) {
      target.pathname = LABS_HOME_PATH;
      target.search = "";
      target.hash = "";
      return { type: "redirect", url: target.toString() };
    }
    return { type: "allow" };
  }

  if (AUTH_PATHS.includes(target.pathname as (typeof AUTH_PATHS)[number])) {
    target.host = resolvePrimaryPlatformHost(input);
    if ((input.nodeEnv ?? process.env.NODE_ENV) === "production") {
      target.protocol = "https:";
      target.port = "";
    }
    return { type: "redirect", url: target.toString() };
  }

  if (target.pathname.startsWith("/api/")) {
    return isAllowedLabsApiPath(target.pathname)
      ? { type: "allow" }
      : { type: "reject", status: 404 };
  }

  if (target.pathname.includes(".") || target.pathname.startsWith("/_next/")) {
    return { type: "allow" };
  }

  target.pathname = LABS_HOME_PATH;
  target.search = "";
  target.hash = "";
  return { type: "redirect", url: target.toString() };
}

export function buildPublicSiteRedirectUrl({
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

  const target = new URL(url);
  const isPublicPath = PUBLIC_MARKETING_PATHS.some(
    (path) =>
      target.pathname === path ||
      (path === "/developers/docs" &&
        target.pathname.startsWith("/developers/docs/")),
  );

  if (!isPublicPath) {
    return null;
  }

  const publicOrigin = new URL(productOrigins.publicSite);
  target.protocol = publicOrigin.protocol;
  target.host = publicOrigin.host;
  return target.toString();
}

export function buildPrimaryHostRedirectUrl({
  hostname,
  url,
  input = {},
}: {
  hostname: string;
  url: string;
  input?: PlatformHostsInput;
}) {
  if (!isLabsHost(hostname, input)) {
    return null;
  }

  const redirectUrl = new URL(url);
  const isAllowedLabsPath =
    redirectUrl.pathname === "/" ||
    redirectUrl.pathname === "/app" ||
    redirectUrl.pathname.startsWith("/api") ||
    isLabsWorkspacePath(redirectUrl.pathname);

  if (isAllowedLabsPath) {
    return null;
  }

  redirectUrl.host = resolvePrimaryPlatformHost(input);
  if ((input.nodeEnv ?? process.env.NODE_ENV) === "production") {
    redirectUrl.protocol = "https:";
    redirectUrl.port = "";
  }

  return redirectUrl.toString();
}

export function getDefaultPlatformPathForHost(hostname: string, input: PlatformHostsInput = {}) {
  return isLabsHost(hostname, input) ? LABS_HOME_PATH : "/app";
}

export function resolveEditorHost(input: EditorHostInput = {}) {
  const {
    nodeEnv = process.env.NODE_ENV,
    editorUrl = process.env.BUSINESS_EDITOR_URL,
  } = input;
  const configuredHost = normalizeHostCandidate(editorUrl ?? "");

  if (configuredHost) {
    return configuredHost;
  }

  return nodeEnv === "production" ? "business.vase.ar" : "localhost:5173";
}
