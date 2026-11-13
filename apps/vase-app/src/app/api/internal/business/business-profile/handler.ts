import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { getBusinessProfilePayload } from "@/server/services/business-profile";

type Dependencies = {
  authorize(authorization: string | null): void;
  loadProfile(tenantId: string): Promise<unknown | null>;
};

/** Mi negocio para los productos de Vase. Solo con el token interno. */
export function createBusinessProfileHandler(dependencies: Dependencies) {
  return async function GET(request: Request) {
    try {
      dependencies.authorize(request.headers.get("authorization"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "FORBIDDEN";
      return NextResponse.json(
        { error: message === "SERVICE_TOKEN_NOT_CONFIGURED" ? message : "FORBIDDEN" },
        { status: message === "SERVICE_TOKEN_NOT_CONFIGURED" ? 503 : 403 },
      );
    }

    const globalTenantId = new URL(request.url).searchParams.get("globalTenantId")?.trim() ?? "";
    if (!globalTenantId || globalTenantId.length > 64) {
      return NextResponse.json({ error: "GLOBAL_TENANT_ID_REQUIRED" }, { status: 400 });
    }

    const profile = await dependencies.loadProfile(globalTenantId);
    if (!profile) return NextResponse.json({ error: "TENANT_NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ profile }, { headers: { "Cache-Control": "no-store" } });
  };
}

export const GET = createBusinessProfileHandler({
  authorize: (authorization) => assertServiceToken(authorization, process.env.SERVICE_TO_SERVICE_TOKEN),
  loadProfile: getBusinessProfilePayload,
});
