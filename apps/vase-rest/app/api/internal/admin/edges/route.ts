import { NextResponse } from "next/server";
import { assertServiceToken } from "@vase/internal-api";
import { db } from "@/lib/db";
import { buildRestAdminOperations } from "@/lib/admin/operations";

export async function GET(request: Request) {
  try {
    assertServiceToken(
      request.headers.get("authorization"),
      process.env.SERVICE_TO_SERVICE_TOKEN,
    );
    const edges = await db.edgeInstallation.findMany({
      orderBy: [{ globalTenantId: "asc" }, { name: "asc" }],
      select: {
        id: true,
        globalTenantId: true,
        branchId: true,
        name: true,
        status: true,
        agentVersion: true,
        lastSeenAt: true,
        lastCloudSyncAt: true,
        pendingEventCount: true,
        failedPrintJobCount: true,
        lastErrorCode: true,
        branch: { select: { name: true } },
      },
    });
    const result = buildRestAdminOperations({
      tenants: [],
      edges: edges.map(({ branch, ...edge }) => ({
        ...edge,
        branchName: branch.name,
      })),
    });
    return NextResponse.json({
      generatedAt: result.generatedAt,
      edges: result.edges,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "REST_ADMIN_FAILED";
    return NextResponse.json({ error: code }, {
      status: code === "FORBIDDEN" ? 403
        : code.includes("NOT_CONFIGURED") ? 503 : 400,
    });
  }
}
