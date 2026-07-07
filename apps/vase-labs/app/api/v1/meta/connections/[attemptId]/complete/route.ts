import { NextResponse } from "next/server";
import { createMetaRuntime } from "../../../../../../lib/meta-runtime";
import { resolveLabsRequestContext } from "../../../../../../lib/request-context";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    const { attemptId } = await params;
    const { context } = await resolveLabsRequestContext(request.headers.get("cookie"));
    const body = await request.json().catch(() => ({}));
    const candidateId =
      typeof body.candidateId === "string" ? body.candidateId.trim() : "";
    if (!candidateId) {
      return NextResponse.json({ error: "META_ASSET_REQUIRED" }, { status: 400 });
    }

    return NextResponse.json(
      await createMetaRuntime().service.complete({
        attemptId,
        globalUserId: context.globalUserId,
        globalTenantId: context.globalTenantId,
        candidateId,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "META_CONNECTION_COMPLETE_FAILED";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
