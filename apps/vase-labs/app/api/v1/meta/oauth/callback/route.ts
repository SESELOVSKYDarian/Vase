import { NextResponse } from "next/server";
import { createMetaRuntime } from "../../../../../lib/meta-runtime";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const destination = new URL("/", url.origin);

  if (!code || !state) {
    destination.searchParams.set("oauth", "cancelled");
    return NextResponse.redirect(destination);
  }

  try {
    const result = await createMetaRuntime().service.callback({ code, state });
    destination.searchParams.set("oauth", "complete");
    destination.searchParams.set("attempt", result.attemptId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "META_OAUTH_FAILED";
    const safeCode = [
      "META_OAUTH_STATE_EXPIRED",
      "META_OAUTH_STATE_CONSUMED_OR_MISMATCHED",
      "META_NO_ELIGIBLE_ASSETS",
    ].includes(message)
      ? message
      : "META_OAUTH_FAILED";
    destination.searchParams.set("oauth", "failed");
    destination.searchParams.set("reason", safeCode);
  }

  return NextResponse.redirect(destination);
}
