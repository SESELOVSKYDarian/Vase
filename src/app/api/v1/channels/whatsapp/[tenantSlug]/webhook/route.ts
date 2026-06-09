import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { parseWhatsAppWebhookMessage, verifyMetaSignature } from "@/lib/integrations";
import { generateMetaWebhookVerifyToken } from "@/lib/integrations/meta-webhook";
import { handleInboundChannelMessage } from "@/server/services/chatbot/orchestrator";

export const dynamic = "force-dynamic";

async function getOfficialChannel(tenantSlug: string) {
  return prisma.aiChannelConnection.findFirst({
    where: {
      tenant: { slug: tenantSlug },
      channelType: "WHATSAPP",
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
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  if (!tenant) {
    return new NextResponse("Not configured", { status: 404 });
  }

  const channel = await getOfficialChannel(tenantSlug);

  const workspace = await prisma.tenantAiWorkspace.findUnique({
    where: { tenantId: tenant.id },
    select: { webhookVerifyToken: true },
  });

  const verifyTokenFromChannel =
    channel && channel.config && typeof channel.config === "object"
      ? String((channel.config as Record<string, unknown>).verifyToken || "")
      : "";
  const verifyToken =
    verifyTokenFromChannel ||
    workspace?.webhookVerifyToken ||
    generateMetaWebhookVerifyToken(tenantSlug);
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
