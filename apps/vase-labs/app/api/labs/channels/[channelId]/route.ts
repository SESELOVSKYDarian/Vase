import { NextResponse } from "next/server";
import { buildManualChannelSetup, resolveCanonicalLabsOrigin } from "../../../../lib/channel-manual-setup";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";

export async function GET(request: Request, { params }: { params: Promise<{ channelId: string }> }) {
  try {
    const { channelId } = await params;
    const { assistant, context } = await resolveLabsRequestContext(request.headers.get("cookie"));
    const channel = await labsPrisma.channel.findFirst({
      where: { id: channelId, assistantId: assistant.id, provider: "META_OFFICIAL" },
      include: { secrets: { where: { kind: { in: ["META_ACCESS_TOKEN", "META_APP_SECRET"] } }, select: { kind: true } } },
    });
    if (!channel) return NextResponse.json({ error: "CHANNEL_NOT_FOUND" }, { status: 404 });
    const webhook = buildManualChannelSetup({
      origin: resolveCanonicalLabsOrigin(process.env.NEXT_PUBLIC_APP_URL),
      tenantSlug: context.tenantSlug,
      globalTenantId: context.globalTenantId,
      channelType: channel.type,
    });
    const config = channel.config && typeof channel.config === "object" && !Array.isArray(channel.config) ? channel.config as Record<string, unknown> : {};
    return NextResponse.json({
      channelId: channel.id, channelType: channel.type, status: channel.status, ...webhook,
      providerAccountId: channel.providerAccountId,
      parentId: channel.type === "WHATSAPP" ? channel.wabaId : typeof config.parentId === "string" ? config.parentId : null,
      accountLabel: channel.accountLabel,
      accessTokenMasked: channel.secrets.some((item) => item.kind === "META_ACCESS_TOKEN") ? "••••••••••••" : null,
      appSecretMasked: channel.secrets.some((item) => item.kind === "META_APP_SECRET") ? "••••••••••••" : null,
      health: {
        webhookVerified: Boolean(channel.webhookVerifiedAt),
        credentialsPresent: channel.secrets.some((item) => item.kind === "META_ACCESS_TOKEN") && (channel.secrets.some((item) => item.kind === "META_APP_SECRET") || Boolean(process.env.META_APP_SECRET?.trim())),
        assetVerified: Boolean(channel.providerAccountId),
        subscriptionActive: Array.isArray(config.subscribedFields) && config.subscribedFields.length > 0,
      },
    });
  } catch {
    return NextResponse.json({ error: "CHANNEL_READ_FAILED" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ channelId: string }> }) {
  const { channelId } = await context.params;
  return import("../../../v1/channels/[tenantSlug]/route").then(({ DELETE }) =>
    DELETE(request, { params: Promise.resolve({ tenantSlug: channelId }) }));
}
