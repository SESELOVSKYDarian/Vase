import { BUSINESS_LAUNCH_PATH } from "@/lib/business/links";

export function requiresFullDocumentNavigation(href: string | null | undefined) {
  if (!href) return false;

  return (
    href === BUSINESS_LAUNCH_PATH ||
    href === "/app/labs" ||
    href.startsWith("/app/labs/") ||
    href === "/app/owner/labs" ||
    href.startsWith("/app/owner/labs/")
  );
}
