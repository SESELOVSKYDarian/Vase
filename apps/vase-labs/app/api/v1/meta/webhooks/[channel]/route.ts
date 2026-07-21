import { labsChannelSchema, type LabsChannel } from "@vase/contracts";
import { NextResponse } from "next/server";
import {
  handleGlobalMetaChannelWebhook,
  PrismaChannelWebhookRepository,
  type ParseChannelWebhookMessage,
} from "../../../../../lib/channel-webhook-service";
import { createPrismaChannelAiReplyRunner } from "../../../../../lib/channel-ai-runner";
import { labsPrisma } from "../../../../../lib/db";
import { parseFacebookWebhookMessage } from "../../../../../lib/facebook-webhook";
import { parseInstagramWebhookMessage } from "../../../../../lib/instagram-webhook";
import { parseWhatsAppWebhookMessage } from "../../../../../lib/whatsapp-webhook";

export const dynamic = "force-dynamic";

const repository = new PrismaChannelWebhookRepository(labsPrisma);
const runAiReply = createPrismaChannelAiReplyRunner();

function parseChannel(value: string): LabsChannel {
  return labsChannelSchema.parse(value.trim().toUpperCase());
}

function parserFor(channelType: LabsChannel): ParseChannelWebhookMessage {
  if (channelType === "FACEBOOK") return parseFacebookWebhookMessage;
  if (channelType === "INSTAGRAM") return parseInstagramWebhookMessage;
  return ({ globalTenantId, payload }) =>
    parseWhatsAppWebhookMessage({
      globalTenantId,
      payload,
      channelType: "WHATSAPP",
      provider: "META_OFFICIAL",
    });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ channel: string }> },
) {
  try {
    parseChannel((await params).channel);
    const searchParams = new URL(request.url).searchParams;
    const valid =
      searchParams.get("hub.mode") === "subscribe" &&
      searchParams.get("hub.verify_token") === process.env.META_VERIFY_TOKEN &&
      Boolean(searchParams.get("hub.challenge"));
    return new NextResponse(
      valid ? searchParams.get("hub.challenge") : "Forbidden",
      { status: valid ? 200 : 403 },
    );
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ channel: string }> },
) {
  try {
    const channelType = parseChannel((await params).channel);
    const rawBody = await request.text();
    const result = await handleGlobalMetaChannelWebhook({
      channelType,
      repository,
      rawBody,
      signatureHeader: request.headers.get("x-hub-signature-256"),
      appSecret: process.env.META_APP_SECRET ?? "",
      parseMessage: parserFor(channelType),
      runAiReply,
    });
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_channel" }, { status: 404 });
  }
}
