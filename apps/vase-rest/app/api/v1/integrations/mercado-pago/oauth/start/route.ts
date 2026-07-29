import { NextResponse } from "next/server";
import { resolveRestOwnerRequest } from "@/lib/request-context";
import { db } from "@/lib/db";
import { mercadoPagoOAuthFromEnvironment } from "@/lib/payments/mercado-pago-oauth";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const context = await resolveRestOwnerRequest({
      cookieHeader: request.headers.get("cookie"),
      requestedTenantSlug: url.searchParams.get("tenant") ?? undefined,
    });
    const branchId = url.searchParams.get("branchId") ?? "";
    const branch = await db.branch.findFirst({
      where: { id: branchId, globalTenantId: context.globalTenantId, active: true },
    });
    if (!branch) throw new Error("REST_MP_BRANCH_FORBIDDEN");
    const oauth = mercadoPagoOAuthFromEnvironment();
    const authorization = oauth.authorize({
      tenant: context.globalTenantId,
      branch: branch.id,
      environment: url.searchParams.get("environment") === "PRODUCTION"
        ? "PRODUCTION" : "SANDBOX",
    });
    const response = NextResponse.redirect(authorization.url);
    response.cookies.set("vase-rest-mp-pkce", authorization.verifier, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/api/v1/integrations/mercado-pago/oauth/callback",
    });
    return response;
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "REST_MP_OAUTH_FAILED",
    }, { status: 400 });
  }
}
