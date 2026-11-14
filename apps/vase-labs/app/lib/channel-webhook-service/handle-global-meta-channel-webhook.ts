// Parte de channel-webhook-service.ts: handleGlobalMetaChannelWebhook.
import { type LabsChannel } from "@vase/contracts";
import { verifyMetaSignature } from "../meta-signature";
import { ChannelWebhookPostResult, ChannelWebhookRepository, ParseChannelWebhookMessage, ResolveInboundCustomerName, RunChannelAiReply, normalizeRecord } from "./channel-webhook-repository";
import { handleMetaChannelWebhook } from "./handle-meta-channel-webhook";

export async function handleGlobalMetaChannelWebhook(input: {
  channelType: LabsChannel;
  repository: ChannelWebhookRepository;
  rawBody: string;
  signatureHeader: string | null;
  appSecret: string;
  parseMessage: ParseChannelWebhookMessage;
  runAiReply?: RunChannelAiReply;
  resolveCustomerName?: ResolveInboundCustomerName;
}): Promise<ChannelWebhookPostResult> {
  if (!verifyMetaSignature(input.appSecret, input.rawBody, input.signatureHeader)) {
    return { status: 401, body: { ok: false, reason: "invalid_signature" } };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(input.rawBody);
  } catch {
    return { status: 200, body: { ok: true, ignored: true, reason: "invalid_json" } };
  }

  const entry = normalizeRecord(payload)?.entry;
  const firstEntry = Array.isArray(entry) ? normalizeRecord(entry[0]) : null;
  const providerAccountId =
    typeof firstEntry?.id === "string" ? firstEntry.id.trim() : "";
  if (!providerAccountId || !input.repository.findContextByProviderAccountId) {
    return { status: 200, body: { ok: true, ignored: true, reason: "provider_account_missing" } };
  }

  const context = await input.repository.findContextByProviderAccountId(
    input.channelType,
    providerAccountId,
  );
  if (!context) {
    return { status: 200, body: { ok: true, ignored: true, reason: "channel_not_configured" } };
  }

  const repository: ChannelWebhookRepository = {
    ...input.repository,
    findContextByTenantSlug: async () => context,
  };
  return handleMetaChannelWebhook({
    channelType: input.channelType,
    repository,
    tenantSlug: context.tenantSlug,
    rawBody: input.rawBody,
    signatureHeader: input.signatureHeader,
    appSecret: input.appSecret,
    parseMessage: input.parseMessage,
    runAiReply: input.runAiReply,
    resolveCustomerName: input.resolveCustomerName,
  });
}
