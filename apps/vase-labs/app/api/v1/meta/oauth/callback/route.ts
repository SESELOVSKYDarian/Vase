import { NextResponse } from "next/server";
import { createMetaOAuthService } from "../../../../../lib/meta-oauth";

function createService() {
  return createMetaOAuthService({
    appId: process.env.META_APP_ID ?? "",
    appSecret: process.env.META_APP_SECRET ?? "",
    redirectUri: process.env.META_OAUTH_REDIRECT_URI ?? "https://labs.vase.ar/api/v1/meta/oauth/callback",
    stateSecret: process.env.META_WEBHOOK_SECRET ?? process.env.SERVICE_TO_SERVICE_TOKEN ?? "local-meta-state-secret",
  });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  const state = params.get("state");

  if (!code || !state) {
    return NextResponse.json({ error: "CODE_AND_STATE_REQUIRED" }, { status: 400 });
  }

  try {
    const service = createService();
    const statePayload = service.verifyState(state);
    const token = await service.exchangeCodeForAccessToken(code);

    return NextResponse.json({
      ok: true,
      tenantSlug: statePayload.tenantSlug,
      channelType: statePayload.channelType,
      tokenType: token.tokenType,
      expiresIn: token.expiresIn,
      accessToken: "secret_configured",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "META_OAUTH_CALLBACK_FAILED" }, { status: 400 });
  }
}
