import { createHealthResponse } from "@vase/internal-api";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(createHealthResponse({ service: "vase-workplace", domain: "workplace.vase.ar", checks: { app: "ok", database: "postgres-workplace", redis: "redis-platform" } }));
}
