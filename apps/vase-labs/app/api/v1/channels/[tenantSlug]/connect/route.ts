import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json(
    { error: "USE_OFFICIAL_META_CONNECTION_FLOW" },
    { status: 410 },
  );
}
