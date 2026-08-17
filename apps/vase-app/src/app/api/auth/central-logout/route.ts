import { signOut } from "@/auth";

const productionOrigins = new Set([
  "https://app.vase.ar",
  "https://management.vase.ar",
]);

function addConfiguredOrigin(origins: Set<string>, value: string | undefined) {
  if (!value) return;

  try {
    origins.add(new URL(value).origin);
  } catch {
    // Invalid deployment configuration must not broaden the allowlist.
  }
}

function isLoopbackDevelopmentOrigin(origin: URL) {
  return process.env.NODE_ENV !== "production"
    && (origin.protocol === "http:" || origin.protocol === "https:")
    && ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
}

function isAllowedLogoutOrigin(request: Request) {
  const originHeader = request.headers.get("origin");
  if (!originHeader || originHeader === "null") return false;

  let origin: URL;
  try {
    origin = new URL(originHeader);
  } catch {
    return false;
  }

  if (origin.username || origin.password) return false;
  if (isLoopbackDevelopmentOrigin(origin)) return true;

  const allowedOrigins = new Set(productionOrigins);
  addConfiguredOrigin(allowedOrigins, process.env.NEXT_PUBLIC_APP_URL);
  addConfiguredOrigin(allowedOrigins, process.env.MANAGEMENT_PUBLIC_URL);

  return allowedOrigins.has(origin.origin);
}

export async function POST(request: Request) {
  if (!isAllowedLogoutOrigin(request)) {
    return Response.json(
      { error: "CENTRAL_LOGOUT_ORIGIN_FORBIDDEN" },
      { status: 403, headers: { "cache-control": "no-store" } },
    );
  }

  await signOut({ redirectTo: "/signin" });
}
