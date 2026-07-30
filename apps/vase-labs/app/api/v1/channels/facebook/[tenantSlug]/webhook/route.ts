import { NextResponse } from "next/server";
import { labsPrisma } from "../../../../../../lib/db";
import {
  handleMetaChannelWebhook,
  PrismaChannelWebhookRepository,
  verifyMetaChannelWebhookSubscription,
} from "../../../../../../lib/channel-webhook-service";
import { parseFacebookWebhookMessage } from "../../../../../../lib/facebook-webhook";
import { createPrismaChannelAiReplyRunner } from "../../../../../../lib/channel-ai-runner";
import { resolveMetaWebhookAppSecret } from "../../../../../../lib/meta-webhook-channel-secret";
import { createMetaCustomerProfileResolver } from "../../../../../../lib/meta-customer-profile";
import { PrismaOfficialChannelSenderRepository } from "../../../../../../lib/official-channel-sender-repository";

export const dynamic = "force-dynamic";

const repository = new PrismaChannelWebhookRepository(labsPrisma);
const runAiReply = createPrismaChannelAiReplyRunner();
const customerProfiles = createMetaCustomerProfileResolver({
  repository: new PrismaOfficialChannelSenderRepository(labsPrisma),
  encryptionSecret: process.env.TOKEN_ENCRYPTION_SECRET ?? "",
  graphVersion: process.env.META_GRAPH_VERSION?.trim() || "v25.0",
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> },
) {
  const { tenantSlug } = await params;
  const result = await verifyMetaChannelWebhookSubscription({
    channelType: "FACEBOOK",
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
  const appSecret = await resolveMetaWebhookAppSecret({ prisma: labsPrisma, tenantSlug, channelType: "FACEBOOK" });
  const result = await handleMetaChannelWebhook({
    channelType: "FACEBOOK",
    repository,
    tenantSlug,
    rawBody,
    signatureHeader: request.headers.get("x-hub-signature-256"),
    appSecret,
    parseMessage: parseFacebookWebhookMessage,
    runAiReply,
    resolveCustomerName: ({ context, message }) => customerProfiles.resolve({
      globalTenantId: context.globalTenantId,
      channelType: context.channelType,
      userId: message.externalThreadKey,
    }),
  });

  return NextResponse.json(result.body, { status: result.status });
}
