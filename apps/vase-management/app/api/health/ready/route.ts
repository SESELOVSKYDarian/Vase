import { createHealthResponse } from "@vase/internal-api";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    createHealthResponse({
      service: "vase-management",
      domain: "management.vase.ar",
      checks: {
        app: "ok",
        database: "postgres-management",
        redis: "redis-platform",
      },
    }),
  );
}
