import { createHealthResponse } from "@vase/internal-api";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(createHealthResponse({ service: "vase-help", domain: "help.vase.ar", checks: { app: "ok", database: "postgres-help", redis: "redis-platform" } }));
}
