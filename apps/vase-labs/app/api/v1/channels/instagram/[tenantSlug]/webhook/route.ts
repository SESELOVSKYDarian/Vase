import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../../lib/db";
import {
  handleMetaChannelWebhook,
  PrismaChannelWebhookRepository,
  verifyMetaChannelWebhookSubscription,
} from "../../../../../../lib/channel-webhook-service";
import { parseInstagramWebhookMessage } from "../../../../../../lib/instagram-webhook";

export const dynamic = "force-dynamic";

const repository = new PrismaChannelWebhookRepository(labsPrisma);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const result = await verifyMetaChannelWebhookSubscription({
    channelType: "INSTAGRAM",
    repository,
    tenantSlug,
    url: request.url,
  });

  return new NextResponse(result.body, { status: result.status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const rawBody = await request.text();
  const result = await handleMetaChannelWebhook({
    channelType: "INSTAGRAM",
    repository,
    tenantSlug,
    rawBody,
    signatureHeader: request.headers.get("x-hub-signature-256"),
    appSecret: process.env.META_APP_SECRET,
    parseMessage: parseInstagramWebhookMessage,
  });

  return NextResponse.json(result.body, { status: result.status });
}
