import { NextResponse } from "next/server";
import { assertServiceToken } from "@vase/internal-api";
import { processManagementOutbox } from "@/lib/integration/outbox";

export async function POST(request: Request) {
  try {
    assertServiceToken(request.headers.get("authorization"), process.env.SERVICE_TO_SERVICE_TOKEN);
    return NextResponse.json({ processed: await processManagementOutbox() });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "FORBIDDEN" }, { status: 403 }); }
}
