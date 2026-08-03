type AdminActor = {
  id: string;
  name: string;
  email: string;
  platformRole: "SUPER_ADMIN";
};

export async function requireAdminSession(cookieHeader: string | null): Promise<AdminActor> {
  if (!cookieHeader) throw new Error("ADMIN_SESSION_REQUIRED");
  const response = await fetch(new URL(
    "/api/internal/admin/session",
    process.env.APP_INTERNAL_URL ?? "http://app-vase:3002",
  ), {
    headers: {
      authorization: `Bearer ${process.env.SERVICE_TO_SERVICE_TOKEN ?? ""}`,
      cookie: cookieHeader,
      accept: "application/json",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  const payload = await response.json().catch(() => ({})) as {
    actor?: Partial<AdminActor>;
  };
  if (
    !response.ok ||
    !payload.actor?.id ||
    payload.actor.platformRole !== "SUPER_ADMIN"
  ) {
    throw new Error("ADMIN_SESSION_FORBIDDEN");
  }
  return {
    id: payload.actor.id,
    name: payload.actor.name ?? "Super Admin",
    email: payload.actor.email ?? "",
    platformRole: "SUPER_ADMIN",
  };
}

export function adminSignInUrl() {
  const target = process.env.NEXT_PUBLIC_APP_URL ?? "https://admin.vase.ar";
  const signIn = new URL("/signin", process.env.VASE_APP_PUBLIC_URL ?? "https://app.vase.ar");
  signIn.searchParams.set("redirectTo", target);
  return signIn.toString();
}

export function adminApiFailure(error: unknown) {
  const code = error instanceof Error ? error.message : "ADMIN_SESSION_FORBIDDEN";
  return Response.json({ error: code }, {
    status: code === "ADMIN_SESSION_REQUIRED" || code === "ADMIN_SESSION_FORBIDDEN" ? 401 : 503,
  });
}
