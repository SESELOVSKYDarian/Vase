import { BUSINESS_LAUNCH_PATH } from "@/lib/business/links";
import { productOrigins } from "@/config/origins";

export const PRIMARY_PLATFORM_ORIGIN = "https://app.vase.ar";

export function resolveAppHomeHref() {
  return productOrigins.publicSite;
}

export function resolveShortcutHref(id: string, target: string) {
  return id === "goto_home" ? resolveAppHomeHref() : target;
}

function readPathname(href: string) {
  try {
    return new URL(href, PRIMARY_PLATFORM_ORIGIN).pathname;
  } catch {
    return href;
  }
}

function isLabsHost(hostname: string | null | undefined) {
  const normalized = hostname?.trim().toLowerCase().split(":")[0] ?? "";
  return normalized === "labs.vase.ar" || normalized.startsWith("labs.");
}

function isInternalPath(href: string) {
  return href.startsWith("/") && !href.startsWith("//");
}

function isLabsNavigationPath(pathname: string) {
  return (
    pathname === "/app/labs" ||
    pathname.startsWith("/app/labs/") ||
    pathname === "/app/owner/labs" ||
    pathname.startsWith("/app/owner/labs/")
  );
}

export function resolveNavigationHrefForHost(href: string, hostname: string | null | undefined) {
  if (!isLabsHost(hostname) || !isInternalPath(href)) {
    return href;
  }

  const pathname = readPathname(href);

  if (isLabsNavigationPath(pathname)) {
    return href;
  }

  return new URL(href, PRIMARY_PLATFORM_ORIGIN).toString();
}

export function requiresFullDocumentNavigation(href: string | null | undefined) {
  if (!href) return false;

  const pathname = readPathname(href);

  return (
    href === BUSINESS_LAUNCH_PATH ||
    isLabsNavigationPath(pathname)
  );
}
