export type AdminHostInput = {
  nodeEnv?: string;
  adminHost?: string;
  primaryHost?: string;
};

const ADMIN_INTERNAL_PREFIX = "/app/admin";
const AUTH_PATHS = new Set([
  "/signin",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
]);
const ADMIN_SECTIONS = new Set([
  "users",
  "modules",
  "management",
  "labs",
  "rest",
  "finance",
  "expenses",
  "meetings",
  "customizations",
  "development",
  "tickets",
  "support",
  "faqs",
  "wiki",
  "settings",
  "audit",
]);

function normalizeHost(value: string, nodeEnv = process.env.NODE_ENV) {
  const normalized = value.trim().toLowerCase().replace(/\/+$/, "");
  if (!normalized) return "";

  try {
    if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
      return new URL(normalized).host.toLowerCase();
    }
  } catch {
    return "";
  }

  if (nodeEnv === "production" && normalized.includes(":") && !normalized.startsWith("[")) {
    return normalized.split(":")[0] ?? normalized;
  }
  return normalized;
}

export function resolveAdminHost(input: AdminHostInput = {}) {
  const configured = input.adminHost ?? process.env.VASE_ADMIN_HOST;
  const fallback = (input.nodeEnv ?? process.env.NODE_ENV) === "production"
    ? "admin.vase.ar"
    : "admin.localhost:3002";
  return normalizeHost(configured || fallback, input.nodeEnv);
}

export function isAdminHost(hostname: string, input: AdminHostInput = {}) {
  return normalizeHost(hostname, input.nodeEnv) === resolveAdminHost(input);
}

function resolvePrimaryHost(input: AdminHostInput) {
  return normalizeHost(
    input.primaryHost ?? process.env.VASE_PRIMARY_HOST ??
      ((input.nodeEnv ?? process.env.NODE_ENV) === "production" ? "app.vase.ar" : "localhost:3002"),
    input.nodeEnv,
  );
}

function firstSegment(pathname: string) {
  return pathname.split("/").filter(Boolean)[0] ?? "";
}

export function toInternalAdminPath(pathname: string) {
  if (pathname === "/") return ADMIN_INTERNAL_PREFIX;
  if (!pathname.startsWith("/") || !ADMIN_SECTIONS.has(firstSegment(pathname))) return null;
  return `${ADMIN_INTERNAL_PREFIX}${pathname}`;
}

export function toPublicAdminPath(pathname: string) {
  if (pathname === ADMIN_INTERNAL_PREFIX || pathname === `${ADMIN_INTERNAL_PREFIX}/`) return "/";
  if (!pathname.startsWith(`${ADMIN_INTERNAL_PREFIX}/`)) return null;
  const publicPath = pathname.slice(ADMIN_INTERNAL_PREFIX.length);
  return ADMIN_SECTIONS.has(firstSegment(publicPath)) ? publicPath : null;
}

export function buildAdminCanonicalUrl({
  url,
  input = {},
}: {
  url: string;
  input?: AdminHostInput;
}) {
  const target = new URL(url);
  const publicPath = toPublicAdminPath(target.pathname);
  if (!publicPath) return null;
  target.host = resolveAdminHost(input);
  target.pathname = publicPath;
  if ((input.nodeEnv ?? process.env.NODE_ENV) === "production") {
    target.protocol = "https:";
    target.port = "";
  }
  return target.toString();
}

function isAllowedAdminApi(pathname: string) {
  return pathname.startsWith("/api/auth/") || pathname.startsWith("/api/admin/");
}

export function resolveAdminHostRequest({
  hostname,
  url,
  input = {},
}: {
  hostname: string;
  url: string;
  input?: AdminHostInput;
}):
  | { type: "allow" }
  | { type: "redirect"; url: string }
  | { type: "rewrite"; url: string }
  | { type: "reject"; status: 404 } {
  if (!isAdminHost(hostname, input)) return { type: "allow" };
  const target = new URL(url);

  if (target.pathname.startsWith("/_next/") || target.pathname.includes(".")) {
    return { type: "allow" };
  }
  if (target.pathname.startsWith("/api/")) {
    return isAllowedAdminApi(target.pathname)
      ? { type: "allow" }
      : { type: "reject", status: 404 };
  }
  if (AUTH_PATHS.has(target.pathname)) {
    target.host = resolvePrimaryHost(input);
    if ((input.nodeEnv ?? process.env.NODE_ENV) === "production") {
      target.protocol = "https:";
      target.port = "";
    }
    return { type: "redirect", url: target.toString() };
  }

  const internalPath = toInternalAdminPath(target.pathname);
  if (!internalPath) return { type: "reject", status: 404 };
  target.pathname = internalPath;
  return { type: "rewrite", url: target.toString() };
}

export function resolveAdminAccessDecision({
  hostname,
  url,
  isSignedIn,
  isEmailVerified,
  platformRole,
  input = {},
}: {
  hostname: string;
  url: string;
  isSignedIn: boolean;
  isEmailVerified: boolean;
  platformRole: string | null | undefined;
  input?: AdminHostInput;
}):
  | { type: "allow" }
  | { type: "redirect"; url: string }
  | { type: "rewrite"; url: string }
  | { type: "reject"; status: 403 | 404 } {
  if (!isAdminHost(hostname, input)) return { type: "allow" };

  const routeDecision = resolveAdminHostRequest({ hostname, url, input });
  if (routeDecision.type !== "rewrite") return routeDecision;

  if (!isSignedIn || !isEmailVerified) {
    const target = new URL(url);
    const redirectUrl = new URL(
      isSignedIn ? "/verify-email" : "/signin",
      `${(input.nodeEnv ?? process.env.NODE_ENV) === "production" ? "https" : target.protocol.slice(0, -1)}://${resolvePrimaryHost(input)}`,
    );
    redirectUrl.searchParams.set("redirectTo", target.toString());
    return { type: "redirect", url: redirectUrl.toString() };
  }

  if (platformRole !== "SUPER_ADMIN") {
    return { type: "reject", status: 403 };
  }

  return routeDecision;
}
