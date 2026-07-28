import { createInternalAdminHealthPayload } from "@vase/internal-api";
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    createInternalAdminHealthPayload({
      service: "vase-rest",
      domain: "rest.vase.ar",
    }),
  );
}
