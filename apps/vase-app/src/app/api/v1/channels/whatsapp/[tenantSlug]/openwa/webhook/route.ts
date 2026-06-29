import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { parseOpenWaWebhookMessage } from "@/lib/integrations";
import { handleInboundChannelMessage } from "@/server/services/chatbot/orchestrator";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const channel = await prisma.aiChannelConnection.findFirst({
    where: {
      tenant: { slug: tenantSlug },
      channelType: "WHATSAPP",
      status: "CONNECTED",
    },
    orderBy: { createdAt: "asc" },
  });

  if (!channel) {
    return NextResponse.json({ ok: false, error: "channel_not_configured" }, { status: 404 });
  }

  const payload = (await req.json()) as unknown;
  const message = parseOpenWaWebhookMessage({
    tenantId: channel.tenantId,
    payload,
    channelType: "WHATSAPP",
  });

  if (!message) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  await handleInboundChannelMessage(message);
  return NextResponse.json({ ok: true });
}
