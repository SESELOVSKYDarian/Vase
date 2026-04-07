import { NextResponse } from "next/server";
import { assertMonitoringAccess } from "@/lib/security/internal-access";
import { getOperationalMetrics } from "@/server/queries/operations";

export async function GET(request: Request) {
  try {
    assertMonitoringAccess(request);
    const metrics = await getOperationalMetrics();

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      metrics,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    if (error instanceof Error && error.message === "MONITORING_NOT_CONFIGURED") {
      return NextResponse.json({ error: "MONITORING_NOT_CONFIGURED" }, { status: 503 });
    }

    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
