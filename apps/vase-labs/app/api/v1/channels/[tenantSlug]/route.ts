import { NextResponse } from "next/server";
import { labsPrisma, Prisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";
import { disconnectMetaChannel } from "../../../../lib/channel-disconnect";

export function GET() {
  return NextResponse.json(
    { error: "TENANT_SCOPED_CHANNEL_LIST_REMOVED" },
    { status: 410 },
  );
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  try {
    const { tenantSlug: channelId } = await params;
    const { assistant } = await resolveLabsRequestContext(request.headers.get("cookie"));
    return NextResponse.json(await disconnectMetaChannel({
      assistantId: assistant.id,
      channelId,
      repository: {
        async exists(assistantId, id) {
          return Boolean(await labsPrisma.channel.findFirst({ where: { id, assistantId }, select: { id: true } }));
        },
        async clear(assistantId, id) {
          await labsPrisma.$transaction(async (tx) => {
            await tx.channelSecret.deleteMany({ where: { channelId: id, channel: { assistantId } } });
            await tx.channel.updateMany({
              where: { id, assistantId },
              data: {
                status: "DISCONNECTED", providerAccountId: null, phoneNumberId: null, wabaId: null,
                accountLabel: null, externalId: null, externalHandle: null, config: Prisma.JsonNull,
                connectedAt: null, webhookVerifiedAt: null, lastSyncedAt: null, lastError: null,
              },
            });
          });
        },
      },
    }));
  } catch (error) {
    const message = error instanceof Error && error.message === "CHANNEL_NOT_FOUND" ? error.message : "CHANNEL_DISCONNECT_FAILED";
    return NextResponse.json({ error: message }, { status: message === "CHANNEL_NOT_FOUND" ? 404 : 500 });
  }
}
