import { randomUUID } from "node:crypto";
import { labsChannelSchema } from "@vase/contracts";
import { NextResponse } from "next/server";
import { createMetaRuntime } from "../../../../../lib/meta-runtime";
import { resolveLabsRequestContext } from "../../../../../lib/request-context";

export async function POST(request: Request) {
  try {
    const { context } = await resolveLabsRequestContext(request.headers.get("cookie"));
    const body = await request.json().catch(() => ({}));
    const channelType = labsChannelSchema.parse(body.channelType);

    if (channelType === "WHATSAPP" && !process.env.META_WHATSAPP_CONFIG_ID?.trim()) {
      throw new Error("META_WHATSAPP_CONFIG_ID_MISSING");
    }

    const result = await createMetaRuntime().service.start({
      attemptId: randomUUID(),
      globalUserId: context.globalUserId,
      globalTenantId: context.globalTenantId,
      tenantSlug: context.tenantSlug,
      channelType,
      enabledChannels: context.entitlement.enabledChannels,
    });

    return NextResponse.json({
      authorizationUrl: result.authorizationUrl,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "META_CONNECTION_START_FAILED";
    const status =
      message.includes("SESSION") ? 401 : message === "CHANNEL_NOT_INCLUDED" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
