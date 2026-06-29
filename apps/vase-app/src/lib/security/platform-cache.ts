const noStorePlatformPrefixes = ["/app/admin", "/app/support", "/app/owner", "/app/business"];

export function shouldDisablePlatformCache(pathname: string) {
  return (
    pathname.startsWith("/api/") ||
    noStorePlatformPrefixes.some((prefix) => pathname.startsWith(prefix))
  );
}
