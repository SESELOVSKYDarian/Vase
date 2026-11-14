// Parte de platform-hosts.ts: resolveLabsHostRequest, buildPublicSiteRedirectUrl, buildPrimaryHostRedirectUrl, getDefaultPlatformPathForHost, resolveEditorHost.
import { productOrigins } from "@/config/origins";
import { AUTH_PATHS, EditorHostInput, LABS_HOME_PATH, PUBLIC_MARKETING_PATHS, PlatformHostsInput, isAllowedLabsApiPath, isLabsHost, isLabsWorkspacePath, normalizeComparableHost, normalizeHostCandidate, resolvePrimaryPlatformHost } from "./build-labs-host-redirect-url";

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
