import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../../lib/db";
import {
  handleMetaChannelWebhook,
  PrismaChannelWebhookRepository,
  verifyMetaChannelWebhookSubscription,
} from "../../../../../../lib/channel-webhook-service";
import { parseInstagramWebhookMessage } from "../../../../../../lib/instagram-webhook";
import { createPrismaChannelAiReplyRunner } from "../../../../../../lib/channel-ai-runner";
import { resolveMetaWebhookAppSecret } from "../../../../../../lib/meta-webhook-channel-secret";

export const dynamic = "force-dynamic";

const repository = new PrismaChannelWebhookRepository(labsPrisma);
const runAiReply = createPrismaChannelAiReplyRunner();

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
  const appSecret = await resolveMetaWebhookAppSecret({ prisma: labsPrisma, tenantSlug, channelType: "INSTAGRAM" });
  const result = await handleMetaChannelWebhook({
    channelType: "INSTAGRAM",
    repository,
    tenantSlug,
    rawBody,
    signatureHeader: request.headers.get("x-hub-signature-256"),
    appSecret,
    parseMessage: parseInstagramWebhookMessage,
    runAiReply,
  });

  return NextResponse.json(result.body, { status: result.status });
}
