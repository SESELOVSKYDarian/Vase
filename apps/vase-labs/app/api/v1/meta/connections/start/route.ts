import { randomUUID } from "node:crypto";
import { labsChannelSchema } from "@vase/contracts";
import { NextResponse } from "next/server";
import { createMetaRuntime } from "../../../../../lib/meta-runtime";
import { resolveLabsRequestContext } from "../../../../../lib/request-context";
import { listRedactedOfficialChannels } from "../../../../../lib/channel-queries";
import { assertChannelCapacity } from "../../../../../lib/channel-capacity";
import { labsPrisma } from "../../../../../lib/db";
import { getManualChannelId } from "../../../../../lib/channel-manual-setup";

export async function POST(request: Request) {
  try {
    const { context, assistant } = await resolveLabsRequestContext(request.headers.get("cookie"));
    const body = await request.json().catch(() => ({}));
    const channelType = labsChannelSchema.parse(body.channelType);
    const channels = await listRedactedOfficialChannels(labsPrisma, assistant.id);
    const fallbackLimits = Object.fromEntries(
      (["WHATSAPP", "INSTAGRAM", "FACEBOOK"] as const).map((channel) => [channel, context.entitlement.enabledChannels.includes(channel) ? 1 : 0]),
    ) as Record<typeof channelType, number>;
    assertChannelCapacity({
      channelType,
      limits: context.entitlement.channelLimits ?? fallbackLimits,
      channels: channels.filter((channel) => channel.id !== getManualChannelId(assistant.id, channelType)),
    });

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
      message.includes("SESSION") ? 401 : message === "CHANNEL_NOT_INCLUDED" || message === "CHANNEL_LIMIT_REACHED" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
