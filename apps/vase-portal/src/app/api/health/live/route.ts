import { createInternalAdminHealthPayload } from "@vase/internal-api";
import { NextResponse } from "next/server";

/** Chequeo simple: el sitio está prendido. */
export function GET() {
  return NextResponse.json(
    createInternalAdminHealthPayload({
      service: "vase-portal",
      domain: "vase.ar",
    }),
  );
}
