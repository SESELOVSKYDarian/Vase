// Parte de channel-webhook-service.ts: getChannelWebhookVerifyResult, verifyMetaChannelWebhookSubscription.
import { type LabsChannel } from "@vase/contracts";
import { resolveMetaWebhookVerifyToken } from "../meta-webhook";
import { ChannelWebhookContext, ChannelWebhookRepository, ChannelWebhookVerifyResult, readMetaChannelProviderConfig } from "./channel-webhook-repository";

export function getChannelWebhookVerifyResult(input: {
  context: ChannelWebhookContext | null;
  url: string;
}): ChannelWebhookVerifyResult {
  const params = new URL(input.url).searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (!input.context || !input.context.channel?.config) {
    return { status: 403, body: "Forbidden" };
  }

  const providerConfig = readMetaChannelProviderConfig(input.context.channel.config);
  const expectedToken = resolveMetaWebhookVerifyToken(input.context.globalTenantId, providerConfig.verifyToken);

  if (mode === "subscribe" && token && token === expectedToken && challenge) {
    return { status: 200, body: challenge };
  }

  return { status: 403, body: "Forbidden" };
}

export async function verifyMetaChannelWebhookSubscription(input: {
  channelType: LabsChannel;
  repository: ChannelWebhookRepository;
  tenantSlug: string;
  url: string;
}): Promise<ChannelWebhookVerifyResult> {
  const context = input.repository.findManualSubscriptionContext
    ? await input.repository.findManualSubscriptionContext(input.tenantSlug, input.channelType)
    : await input.repository.findContextByTenantSlug(input.tenantSlug, input.channelType);
  if (context?.channelType !== input.channelType) return { status: 403, body: "Forbidden" };
  const result = getChannelWebhookVerifyResult({ context, url: input.url });
  if (result.status === 200 && context && input.repository.markWebhookVerified) {
    await input.repository.markWebhookVerified(context);
  }
  return result;
}
