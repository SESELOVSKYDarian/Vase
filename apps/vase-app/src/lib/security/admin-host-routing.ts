export type AdminHostInput = {
  nodeEnv?: string;
  adminHost?: string;
  primaryHost?: string;
};

export function buildPublicRequestUrl({
  url,
  hostname,
  protocol,
}: {
  url: string;
  hostname: string;
  protocol?: string;
}) {
  const target = new URL(url);
  if (protocol === "http" || protocol === "https") {
    target.protocol = `${protocol}:`;
  }
  const publicHost = hostname.split(",")[0]?.trim();
  if (publicHost) {
    // Assigning URL.host without a port preserves the source URL's port.
    // Parse the public host separately so an internal :3002 never leaks out.
    const publicHostUrl = new URL(`${target.protocol}//${publicHost}`);
    target.hostname = publicHostUrl.hostname;
    target.port = publicHostUrl.port;
  }
  return target.toString();
}

const ADMIN_INTERNAL_PREFIX = "/app/admin";
const AUTH_PATHS = new Set([
  "/signin",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
]);
const ADMIN_SECTIONS = new Set([
  "clients",
  "announcements",
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

function normalizeHost(value: string, nodeEnv: string | undefined = process.env.NODE_ENV) {
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

/** Dirección pública del Admin (https://admin.vase.ar/). Al iniciar sesión, un SUPER_ADMIN va directo ahí. */
export function resolveAdminHomeUrl(input: AdminHostInput & { publicUrl?: string } = {}) {
  const configured = (input.publicUrl ?? process.env.VASE_ADMIN_PUBLIC_URL ?? "").trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "https:" || url.protocol === "http:") return url.toString();
    } catch {
      // Valor inválido: se usa el host del Admin.
    }
  }
  const production = (input.nodeEnv ?? process.env.NODE_ENV) === "production";
  return `${production ? "https" : "http"}://${resolveAdminHost(input)}/`;
}

/** true si la dirección ya apunta al Admin (para respetar un enlace profundo como /clients/123). */
export function isAdminUrl(value: string, input: AdminHostInput = {}) {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && isAdminHost(url.host, input);
  } catch {
    return false;
  }
}

export function resolvePrimaryHost(input: AdminHostInput = {}) {
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

export function resolveAdminNavigationPath(
  internalPath: string,
  hostname: string | null,
  input: AdminHostInput = {},
) {
  if (!hostname || !isAdminHost(hostname, input)) return internalPath;
  return toPublicAdminPath(internalPath) ?? internalPath;
}

export function normalizeAdminPathForActiveState(
  pathname: string,
  hostname: string | null,
  input: AdminHostInput = {},
) {
  if (!hostname || !isAdminHost(hostname, input)) return pathname;
  return toInternalAdminPath(pathname) ?? pathname;
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
  return pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/admin/") ||
    pathname === "/api/health/live" ||
    pathname === "/api/health/ready" ||
    // Imagen de un anuncio (pública, solo lectura): la usan la lista y la vista previa de Admin › Anuncios.
    /^\/api\/announcements\/[a-z0-9]{20,40}\/image$/i.test(pathname);
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

  // Next can run Proxy again after a rewrite. The internal Admin path is
  // already the destination selected by this router and must pass through
  // to the real page instead of being treated as an unknown public section.
  if (
    target.pathname === ADMIN_INTERNAL_PREFIX ||
    target.pathname.startsWith(`${ADMIN_INTERNAL_PREFIX}/`)
  ) {
    return { type: "allow" };
  }

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
