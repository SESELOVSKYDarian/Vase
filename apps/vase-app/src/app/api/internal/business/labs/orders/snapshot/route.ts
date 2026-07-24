import { labsOrderSnapshotRequestSchema } from "@vase/contracts";
import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { listLabsOrderSnapshot } from "@/server/services/labs-business-orders";

type Dependencies = {
  authorize(authorization: string | null): void;
  snapshot(input: { globalTenantId: string; since?: string; limit?: number }): Promise<unknown>;
};

export function createLabsOrderSnapshotRouteHandler(dependencies: Dependencies) {
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

    const params = new URL(request.url).searchParams;
    const parsed = labsOrderSnapshotRequestSchema.safeParse({
      globalTenantId: params.get("globalTenantId"),
      since: params.get("since") ?? undefined,
      limit: params.get("limit") ?? undefined,
    });
    if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });

    try {
      return NextResponse.json(await dependencies.snapshot(parsed.data));
    } catch (error) {
      if (error instanceof Error && error.message === "TENANT_NOT_FOUND") {
        return NextResponse.json({ error: "TENANT_NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({ error: "BUSINESS_ORDER_SNAPSHOT_UNAVAILABLE" }, { status: 502 });
    }
  };
}

export const runtime = "nodejs";

export const GET = createLabsOrderSnapshotRouteHandler({
  authorize: (authorization) => assertServiceToken(authorization, process.env.SERVICE_TO_SERVICE_TOKEN),
  snapshot: listLabsOrderSnapshot,
});
