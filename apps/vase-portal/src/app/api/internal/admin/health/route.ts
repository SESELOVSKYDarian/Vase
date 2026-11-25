import { createInternalAdminHealthResponse } from "@vase/internal-api";
import { NextResponse } from "next/server";

/** Chequeo de salud para el panel interno (pide la clave de servicio). */
export function GET(request: Request) {
  const result = createInternalAdminHealthResponse({
    authorization: request.headers.get("authorization"),
    expectedToken: process.env.SERVICE_TO_SERVICE_TOKEN,
    service: "vase-portal",
    domain: "vase.ar",
  });

  return NextResponse.json(result.body, { status: result.status });
}
