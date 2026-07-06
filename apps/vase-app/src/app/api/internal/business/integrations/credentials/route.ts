import { NextResponse } from "next/server";
import { assertServiceToken } from "@vase/internal-api";
import { introspectBusinessIntegrationCredential } from "@/server/services/integration-credentials";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertServiceToken(
      request.headers.get("authorization"),
      process.env.SERVICE_TO_SERVICE_TOKEN,
    );

    const body = (await request.json()) as {
      tenantSlug?: string;
      token?: string;
      scope?: string;
      consumerSecret?: string;
    };

    const tenantSlug = String(body.tenantSlug || "").trim();
    const token = String(body.token || "").trim();
    const scope = String(body.scope || "").trim();
    const consumerSecret = String(body.consumerSecret || "").trim() || null;

    if (!tenantSlug || !token || !scope) {
      return NextResponse.json(
        { error: "tenantSlug, token y scope son requeridos." },
        { status: 400 },
      );
    }

    const result = await introspectBusinessIntegrationCredential({
      tenantSlug,
      token,
      scope: scope as Parameters<typeof introspectBusinessIntegrationCredential>[0]["scope"],
      consumerSecret,
    });

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const status =
      message === "FORBIDDEN"
        ? 403
        : message === "SERVICE_TOKEN_NOT_CONFIGURED"
          ? 503
          : message === "FORBIDDEN_SCOPE" || message === "INVALID_CONSUMER_SECRET"
            ? 403
            : message === "UNAUTHORIZED"
              ? 401
              : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
