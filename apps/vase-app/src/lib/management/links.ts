const DEFAULT_MANAGEMENT_INTERNAL_URL = "http://localhost:3006";
const DEFAULT_MANAGEMENT_PUBLIC_URL = "https://management.vase.ar";

export function resolveManagementOrigin(value = process.env.MANAGEMENT_INTERNAL_URL) {
  return new URL(value?.trim() || DEFAULT_MANAGEMENT_INTERNAL_URL).origin;
}

export function resolveManagementPublicOrigin(
  value = process.env.MANAGEMENT_PUBLIC_URL,
) {
  return new URL(value?.trim() || DEFAULT_MANAGEMENT_PUBLIC_URL).origin;
}

export function buildManagementSsoUrl(
  ticket: string,
  origin = resolveManagementPublicOrigin(),
) {
  const destination = new URL("/auth/sso", origin);
  destination.searchParams.set("ticket", ticket);
  return destination;
}
