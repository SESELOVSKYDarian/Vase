import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json(
    { error: "USE_AUTHENTICATED_CHANNEL_DELETE" },
    { status: 410 },
  );
}
