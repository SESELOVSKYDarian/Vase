import { NextResponse } from "next/server";
import { resolveRestOwnerRequest } from "@/lib/request-context";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const context = await resolveRestOwnerRequest({
      cookieHeader: request.headers.get("cookie"),
      requestedTenantSlug: new URL(request.url).searchParams.get("tenant") ?? undefined,
    });
    const branches = await db.branch.findMany({
      where: { globalTenantId: context.globalTenantId, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, timezone: true },
    });
    return NextResponse.json({
      tenant: {
        id: context.globalTenantId,
        name: context.tenantName,
        slug: context.tenantSlug,
      },
      actor: {
        id: context.actor.id,
        displayName: context.actor.displayName,
      },
      branches,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "REST_CONTEXT_FAILED";
    return NextResponse.json({ error: code }, {
      status: code.includes("SESSION") ? 401
        : code.includes("FORBIDDEN") ? 403 : 503,
    });
  }
}
