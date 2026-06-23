import { createHealthResponse } from "@vase/internal-api";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(createHealthResponse({ service: "vase-admin", domain: "admin.vase.ar", checks: { app: "ok", database: "postgres-admin", redis: "redis-platform" } }));
}
