import { createHealthResponse } from "@vase/internal-api";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    createHealthResponse({
      service: "vase-app",
      domain: "app.vase.ar",
      checks: { app: "ok", database: "postgres-app", redis: "redis-platform" },
    }),
  );
}
