import { NextResponse } from "next/server";
import { decryptChannelSecret } from "../../../../../lib/channel-secrets";
import { labsPrisma } from "../../../../../lib/db";
import { createMetaRuntime } from "../../../../../lib/meta-runtime";
import { resolveLabsRequestContext } from "../../../../../lib/request-context";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    const { tenantSlug: channelId } = await params;
    const { assistant } = await resolveLabsRequestContext(request.headers.get("cookie"));
    const channel = await labsPrisma.channel.findFirst({
      where: {
        id: channelId,
        assistantId: assistant.id,
        provider: "META_OFFICIAL",
        status: "CONNECTED",
      },
      include: {
        secrets: {
          where: { kind: "META_ACCESS_TOKEN" },
          take: 1,
        },
      },
    });
    const encrypted = channel?.secrets[0]?.encryptedValue;
    if (!channel || !encrypted) {
      return NextResponse.json({ error: "CHANNEL_NOT_CONNECTED" }, { status: 404 });
    }

    const token = decryptChannelSecret(
      encrypted,
      process.env.TOKEN_ENCRYPTION_SECRET ?? "",
    );
    await createMetaRuntime().graph.testConnection({
      channelType: channel.type,
      accessToken: token,
    });
    await labsPrisma.channel.update({
      where: { id: channel.id },
      data: { lastSyncedAt: new Date(), lastError: null },
    });
    return NextResponse.json({ ok: true, status: "CONNECTED" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CHANNEL_TEST_FAILED";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
