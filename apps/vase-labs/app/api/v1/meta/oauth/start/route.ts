import { labsChannelSchema } from "@vase/contracts";
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

export function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tenantSlug = params.get("tenantSlug");
  const channel = params.get("channel");

  if (!tenantSlug || !channel) {
    return NextResponse.json({ error: "TENANT_SLUG_AND_CHANNEL_REQUIRED" }, { status: 400 });
  }

  const result = createService().createAuthorizationUrl({
    tenantSlug,
    channelType: labsChannelSchema.parse(channel),
  });

  return NextResponse.json(result);
}
