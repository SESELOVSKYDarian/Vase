import { createHealthResponse } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { portalOrigins } from "../../../../config/origins";
import { checkPortalAppReadiness } from "../../../../lib/readiness";

export async function GET() {
  const readiness = await checkPortalAppReadiness({
    baseUrl: portalOrigins.appInternal,
  });

  if (!readiness.ok) {
    return NextResponse.json(
      {
        service: "vase-portal",
        domain: "vase.ar",
        status: "error",
        checks: readiness.checks,
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    createHealthResponse({
      service: "vase-portal",
      domain: "vase.ar",
      checks: readiness.checks,
    }),
  );
}
