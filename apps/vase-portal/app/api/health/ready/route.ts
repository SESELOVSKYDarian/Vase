import { createHealthResponse } from "@vase/internal-api";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    createHealthResponse({
      service: "vase-portal",
      domain: "vase.ar",
      checks: { app: "ok", database: "postgres-portal", redis: "redis-platform" },
    }),
  );
}
