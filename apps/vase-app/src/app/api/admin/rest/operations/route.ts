import { NextResponse } from "next/server";
import { requireVerifiedPlatformRole } from "@/lib/auth/guards";
import { getRestAdminOperations } from "@/server/services/rest-admin";

export async function GET(request: Request) {
  void request;
  try {
    await requireVerifiedPlatformRole("SUPER_ADMIN");
    return NextResponse.json(await getRestAdminOperations());
  } catch (error) {
    const message = error instanceof Error ? error.message : "REST_ADMIN_UPSTREAM_UNAVAILABLE";
    const status = message === "UNAUTHENTICATED" ? 401
      : message === "FORBIDDEN" || message === "EMAIL_NOT_VERIFIED" ? 403
        : message === "REST_ADMIN_UPSTREAM_FAILED" ? 502
          : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
