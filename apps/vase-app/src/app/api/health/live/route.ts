import { NextResponse } from "next/server";
import { logEvent } from "@/lib/observability/logger";
import { getLivenessPayload } from "@/server/services/health";

export async function GET() {
  const payload = getLivenessPayload();

  logEvent({
    event: "health.live",
    message: "Liveness probe served.",
    metadata: payload,
  });

  return NextResponse.json(payload, { status: 200 });
}
