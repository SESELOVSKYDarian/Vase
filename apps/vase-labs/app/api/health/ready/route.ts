import { NextResponse } from "next/server";
import { getLabsReadinessPayload } from "../../../lib/labs-readiness";

export async function GET() {
  return NextResponse.json(await getLabsReadinessPayload());
}
