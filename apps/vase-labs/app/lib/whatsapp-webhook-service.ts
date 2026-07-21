import type { PrismaClient } from "./db";
import type {
  ChannelWebhookContext,
  ChannelWebhookRepository,
  ChannelWebhookVerifyResult,
  ChannelWebhookPostResult,
  PersistChannelInboundMessageInput,
  PersistChannelInboundMessageResult,
  RunChannelAiReply,
} from "./channel-webhook-service";
import {
  getChannelWebhookVerifyResult,
  handleMetaChannelWebhook,
  PrismaChannelWebhookRepository,
  verifyMetaChannelWebhookSubscription,
} from "./channel-webhook-service";
import { parseWhatsAppWebhookMessage } from "./whatsapp-webhook";

export type WhatsAppWebhookContext = ChannelWebhookContext;
export type PersistInboundMessageInput = PersistChannelInboundMessageInput;
export type PersistInboundMessageResult = PersistChannelInboundMessageResult;
export type WhatsAppWebhookRepository = ChannelWebhookRepository;
export type WebhookVerifyResult = ChannelWebhookVerifyResult;
export type WebhookPostResult = ChannelWebhookPostResult;

export class PrismaWhatsAppWebhookRepository extends PrismaChannelWebhookRepository {
  constructor(prisma: PrismaClient) {
    super(prisma);
  }
}

export function getWebhookVerifyResult(input: {
  context: WhatsAppWebhookContext | null;
  url: string;
}): WebhookVerifyResult {
  return getChannelWebhookVerifyResult(input);
}

export async function verifyWhatsAppWebhookSubscription(input: {
  repository: WhatsAppWebhookRepository;
  tenantSlug: string;
  url: string;
}): Promise<WebhookVerifyResult> {
  return verifyMetaChannelWebhookSubscription({
    channelType: "WHATSAPP",
    repository: input.repository,
    tenantSlug: input.tenantSlug,
    url: input.url,
  });
}

export async function handleWhatsAppMetaWebhook(input: {
  repository: WhatsAppWebhookRepository;
  tenantSlug: string;
  rawBody: string;
  signatureHeader: string | null;
  appSecret?: string;
  runAiReply?: RunChannelAiReply;
}): Promise<WebhookPostResult> {
  return handleMetaChannelWebhook({
    channelType: "WHATSAPP",
    repository: input.repository,
    tenantSlug: input.tenantSlug,
    rawBody: input.rawBody,
    signatureHeader: input.signatureHeader,
    appSecret: input.appSecret,
    runAiReply: input.runAiReply,
    parseMessage: ({ globalTenantId, payload }) =>
      parseWhatsAppWebhookMessage({
        globalTenantId,
        payload,
        channelType: "WHATSAPP",
        provider: "META_OFFICIAL",
      }),
  });
}
