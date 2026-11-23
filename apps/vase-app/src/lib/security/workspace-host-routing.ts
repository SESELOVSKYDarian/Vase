// workspace.vase.ar: el tablero de tickets y trabajos del equipo de Vase. Las páginas viven en /app/workspace;
// en el host público se ven sin ese prefijo (/, /lista, /i/T-abc). Solo entra el equipo (admin, soporte, desarrollo).
import { resolvePrimaryHost } from "./admin-host-routing";

export type WorkspaceHostInput = { nodeEnv?: string; workspaceHost?: string; primaryHost?: string };

export const WORKSPACE_INTERNAL_PREFIX = "/app/workspace";
const AUTH_PATHS = new Set(["/signin", "/register", "/forgot-password", "/reset-password", "/verify-email"]);
const TEAM_ROLES = new Set(["SUPER_ADMIN", "SUPPORT", "DEVELOPER"]);

function production(input: WorkspaceHostInput) {
  return (input.nodeEnv ?? process.env.NODE_ENV) === "production";
}

function normalizeHost(value: string, input: WorkspaceHostInput) {
  const normalized = value.trim().toLowerCase().replace(/\/+$/, "");
  if (!normalized) return "";
  try {
    if (normalized.startsWith("http://") || normalized.startsWith("https://")) return new URL(normalized).host;
  } catch {
    return "";
  }
  if (production(input) && normalized.includes(":") && !normalized.startsWith("[")) return normalized.split(":")[0] ?? normalized;
  return normalized;
}

export function resolveWorkspaceHost(input: WorkspaceHostInput = {}) {
  const configured = input.workspaceHost ?? process.env.VASE_WORKSPACE_HOST;
  return normalizeHost(configured || (production(input) ? "workspace.vase.ar" : "workspace.localhost:3002"), input);
}

export function isWorkspaceHost(hostname: string, input: WorkspaceHostInput = {}) {
  return normalizeHost(hostname, input) === resolveWorkspaceHost(input);
}

export function isWorkspaceRole(role: string | null | undefined) {
  return Boolean(role && TEAM_ROLES.has(role));
}

/** https://workspace.vase.ar/ (o la ruta pedida). */
export function resolveWorkspaceUrl(path = "/", input: WorkspaceHostInput = {}) {
  const base = `${production(input) ? "https" : "http"}://${resolveWorkspaceHost(input)}`;
  return new URL(path, base).toString();
}

export function isWorkspaceUrl(value: string, input: WorkspaceHostInput = {}) {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && isWorkspaceHost(url.host, input);
  } catch {
    return false;
  }
}

export function resolveWorkspaceAccessDecision({
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
  input?: WorkspaceHostInput;
}):
  | { type: "allow" }
  | { type: "redirect"; url: string }
  | { type: "rewrite"; url: string }
  | { type: "reject"; status: 403 | 404 } {
  if (!isWorkspaceHost(hostname, input)) return { type: "allow" };
  const target = new URL(url);
  const path = target.pathname;

  // Después de reescribir, Next vuelve a pasar por acá con la ruta interna: se deja seguir.
  if (path === WORKSPACE_INTERNAL_PREFIX || path.startsWith(`${WORKSPACE_INTERNAL_PREFIX}/`)) return { type: "allow" };
  if (path.startsWith("/_next/") || path.includes(".")) return { type: "allow" };
  if (path.startsWith("/api/")) {
    return path.startsWith("/api/auth/") || path.startsWith("/api/health/") ? { type: "allow" } : { type: "reject", status: 404 };
  }

  const primary = `${production(input) ? "https" : target.protocol.slice(0, -1)}://${resolvePrimaryHost({ nodeEnv: input.nodeEnv, primaryHost: input.primaryHost })}`;
  if (AUTH_PATHS.has(path)) return { type: "redirect", url: new URL(`${path}${target.search}`, primary).toString() };

  if (!isSignedIn || !isEmailVerified) {
    const redirect = new URL(isSignedIn ? "/verify-email" : "/signin", primary);
    redirect.searchParams.set("redirectTo", target.toString());
    return { type: "redirect", url: redirect.toString() };
  }
  if (!isWorkspaceRole(platformRole)) return { type: "reject", status: 403 };

  target.pathname = path === "/" ? WORKSPACE_INTERNAL_PREFIX : `${WORKSPACE_INTERNAL_PREFIX}${path}`;
  return { type: "rewrite", url: target.toString() };
}
