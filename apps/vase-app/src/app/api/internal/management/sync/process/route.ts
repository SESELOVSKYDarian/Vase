import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { processPlatformManagementOutbox } from "@/server/services/management-sync-outbox";

export async function POST(request: Request) {
  try { assertServiceToken(request.headers.get("authorization"), process.env.SERVICE_TO_SERVICE_TOKEN); return NextResponse.json({ processed: await processPlatformManagementOutbox() }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "FORBIDDEN" }, { status: 403 }); }
}
