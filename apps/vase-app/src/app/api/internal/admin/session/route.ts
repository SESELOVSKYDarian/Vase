import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { requireVerifiedPlatformRole } from "@/lib/auth/guards";

export async function GET(request: Request) {
  try {
    assertServiceToken(
      request.headers.get("authorization"),
      process.env.SERVICE_TO_SERVICE_TOKEN,
    );
    const session = await requireVerifiedPlatformRole("SUPER_ADMIN");
    return NextResponse.json({
      actor: {
        id: session.user.id,
        name: session.user.name ?? "Super Admin",
        email: session.user.email ?? "",
        platformRole: session.user.platformRole,
      },
    });
  } catch {
    return NextResponse.json({ error: "ADMIN_SESSION_FORBIDDEN" }, { status: 403 });
  }
}
