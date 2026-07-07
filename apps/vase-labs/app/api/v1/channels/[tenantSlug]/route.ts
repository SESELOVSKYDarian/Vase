import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../lib/db";
import { resolveLabsRequestContext } from "../../../../lib/request-context";

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
    const channel = await labsPrisma.channel.findFirst({
      where: { id: channelId, assistantId: assistant.id },
      select: { id: true },
    });
    if (!channel) {
      return NextResponse.json({ error: "CHANNEL_NOT_FOUND" }, { status: 404 });
    }

    await labsPrisma.$transaction([
      labsPrisma.channelSecret.deleteMany({ where: { channelId } }),
      labsPrisma.channel.update({
        where: { id: channelId },
        data: {
          status: "DISCONNECTED",
          connectedAt: null,
          lastError: null,
        },
      }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CHANNEL_DISCONNECT_FAILED";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
