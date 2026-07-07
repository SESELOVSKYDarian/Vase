import { metaConnectionAttemptSchema } from "@vase/contracts";
import { NextResponse } from "next/server";
import { createMetaRuntime } from "../../../../../lib/meta-runtime";
import { resolveLabsRequestContext } from "../../../../../lib/request-context";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ attemptId: string }> },
) {
  try {
    const { attemptId } = await params;
    const { context } = await resolveLabsRequestContext(request.headers.get("cookie"));
    const attempt = await createMetaRuntime().repository.findAttempt({
      attemptId,
      globalUserId: context.globalUserId,
      globalTenantId: context.globalTenantId,
    });

    if (!attempt) {
      return NextResponse.json({ error: "META_CONNECTION_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json(
      metaConnectionAttemptSchema.parse({
        id: attempt.id,
        channelType: attempt.channelType,
        status: attempt.status,
        expiresAt: attempt.expiresAt.toISOString(),
        candidates: attempt.candidates,
        errorCode: attempt.errorCode ?? null,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "META_CONNECTION_READ_FAILED";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
