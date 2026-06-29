import { NextResponse } from "next/server";
import { logEvent } from "@/lib/observability/logger";
import { getReadinessPayload } from "@/server/services/health";

export async function GET() {
  try {
    const payload = await getReadinessPayload();

    logEvent({
      event: "health.ready",
      message: "Readiness probe passed.",
      metadata: payload,
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    logEvent({
      level: "error",
      event: "health.ready_failed",
      message: "Readiness probe failed.",
      error,
    });

    return NextResponse.json(
      {
        status: "degraded",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
