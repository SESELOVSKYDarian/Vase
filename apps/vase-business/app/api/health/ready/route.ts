import { createHealthResponse } from "@vase/internal-api";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(createHealthResponse({ service: "vase-business", domain: "business.vase.ar", checks: { app: "ok", database: "postgres-business", redis: "redis-platform", editor: "business.vase.ar" } }));
}
