// El código está repartido por tema en la carpeta channel-webhook-service/. Este archivo solo lo junta.
// partes: ./channel-webhook-service/channel-webhook-repository.ts, ./channel-webhook-service/detect-human-handoff-intent.ts, ./channel-webhook-service/prisma-channel-webhook-repository.ts, ./channel-webhook-service/get-channel-webhook-verify-result.ts, ./channel-webhook-service/handle-meta-channel-webhook.ts, ./channel-webhook-service/handle-global-meta-channel-webhook.ts
export { type ChannelWebhookContext, type PersistChannelInboundMessageInput, type PersistChannelInboundMessageResult, type ChannelWebhookRepository, type ChannelWebhookVerifyResult, type ChannelWebhookPostResult, type ParseChannelWebhookMessage, type RunChannelAiReply, type ResolveInboundCustomerName } from "./channel-webhook-service/channel-webhook-repository";
export { detectHumanHandoffIntent, mergeConversationMetadata } from "./channel-webhook-service/detect-human-handoff-intent";
export { PrismaChannelWebhookRepository } from "./channel-webhook-service/prisma-channel-webhook-repository";
export { getChannelWebhookVerifyResult, verifyMetaChannelWebhookSubscription } from "./channel-webhook-service/get-channel-webhook-verify-result";
export { handleMetaChannelWebhook } from "./channel-webhook-service/handle-meta-channel-webhook";
export { handleGlobalMetaChannelWebhook } from "./channel-webhook-service/handle-global-meta-channel-webhook";
