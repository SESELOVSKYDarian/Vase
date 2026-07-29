import { NextResponse } from "next/server";
import { getRestReadinessPayload } from "../../../lib/rest-readiness";

export async function GET() {
  const payload = await getRestReadinessPayload();
  return NextResponse.json(payload, {
    status: payload.status === "ok" ? 200 : 503,
  });
}
