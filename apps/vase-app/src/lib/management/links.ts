export function resolveManagementOrigin(value = process.env.MANAGEMENT_INTERNAL_URL) {
  return new URL(value?.trim() || "http://localhost:3006").origin;
}

export function buildManagementSsoUrl(ticket: string, origin = resolveManagementOrigin()) {
  const destination = new URL("/auth/sso", origin);
  destination.searchParams.set("ticket", ticket);
  return destination;
}
