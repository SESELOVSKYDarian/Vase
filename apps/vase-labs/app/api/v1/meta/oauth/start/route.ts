import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    { error: "USE_AUTHENTICATED_META_CONNECTION_START" },
    { status: 410 },
  );
}
