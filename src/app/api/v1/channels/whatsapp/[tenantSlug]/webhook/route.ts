import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { parseWhatsAppWebhookMessage, verifyMetaSignature } from "@/lib/integrations";
import { handleInboundChannelMessage } from "@/server/services/chatbot/orchestrator";

export const dynamic = "force-dynamic";

async function getOfficialChannel(tenantSlug: string) {
  return prisma.aiChannelConnection.findFirst({
    where: {
      tenant: { slug: tenantSlug },
      channelType: "WHATSAPP",
      status: "CONNECTED",
    },
    orderBy: { createdAt: "asc" },
    include: {
      tenant: {
        select: { id: true },
      },
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const channel = await getOfficialChannel(tenantSlug);
  if (!channel || !channel.config || typeof channel.config !== "object") {
    return new NextResponse("Not configured", { status: 404 });
  }

  const verifyToken = String((channel.config as Record<string, unknown>).verifyToken || "");
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const channel = await getOfficialChannel(tenantSlug);
  if (!channel || !channel.config || typeof channel.config !== "object") {
    return NextResponse.json({ ok: false, error: "channel_not_configured" }, { status: 404 });
  }

  const config = channel.config as Record<string, unknown>;
  const appSecret = String(config.appSecret || "");
  const rawBody = await req.text();

  if (!verifyMetaSignature(appSecret, rawBody, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as unknown;
  const message = parseWhatsAppWebhookMessage({
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
