import { assertServiceToken } from "@vase/internal-api";
import { NextResponse } from "next/server";
import { getPortalDocument } from "@/server/services/portal-content";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
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

  const { slug } = await params;

  try {
    const doc = await getPortalDocument(slug);
    if (!doc) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    return NextResponse.json({ doc });
  } catch {
    return NextResponse.json(
      { error: "portal_document_unavailable" },
      { status: 503 },
    );
  }
}
