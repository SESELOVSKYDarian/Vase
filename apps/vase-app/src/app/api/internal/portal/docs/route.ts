import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { listPortalDocuments } from "@/server/services/portal-content";

export async function GET(request: Request) {
  try {
    assertServiceToken(
      request.headers.get("authorization"),
      process.env.SERVICE_TO_SERVICE_TOKEN,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "FORBIDDEN";
    return NextResponse.json(
      { error: message.toLowerCase() },
      { status: message === "SERVICE_TOKEN_NOT_CONFIGURED" ? 503 : 403 },
    );
  }

  try {
    return NextResponse.json({ docs: await listPortalDocuments() });
  } catch {
    return NextResponse.json(
      { error: "portal_documents_unavailable" },
      { status: 503 },
    );
  }
}
