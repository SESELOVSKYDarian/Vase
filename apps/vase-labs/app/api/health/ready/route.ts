import { createHealthResponse } from "@vase/internal-api";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(createHealthResponse({ service: "vase-labs", domain: "labs.vase.ar", checks: { app: "ok", database: "postgres-labs", redis: "redis-platform", help: "help.vase.ar" } }));
}
