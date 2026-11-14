// Parte de channel-webhook-service.ts: handleMetaChannelWebhook.
import { normalizeTrainerPhone } from "../knowledge-trainer";
import { type LabsChannel } from "@vase/contracts";
import { verifyMetaSignature } from "../meta-signature";
import { ChannelWebhookPostResult, ChannelWebhookRepository, ParseChannelWebhookMessage, PersistChannelInboundMessageResult, ResolveInboundCustomerName, RunChannelAiReply, canProcessChannelWebhook, readMetaChannelProviderConfig, resolveAiBlockedReason } from "./channel-webhook-repository";
import { detectHumanHandoffIntent } from "./detect-human-handoff-intent";

export async function handleMetaChannelWebhook(input: {
  channelType: LabsChannel;
  repository: ChannelWebhookRepository;
  tenantSlug: string;
  rawBody: string;
  signatureHeader: string | null;
  appSecret?: string;
  parseMessage: ParseChannelWebhookMessage;
  runAiReply?: RunChannelAiReply;
  resolveCustomerName?: ResolveInboundCustomerName;
}): Promise<ChannelWebhookPostResult> {
  const context = await input.repository.findContextByTenantSlug(input.tenantSlug, input.channelType);

  if (!context?.channel?.config) {
    return {
      status: 200,
      body: { ok: true, ignored: true, reason: "channel_not_configured" },
    };
  }

  if (!canProcessChannelWebhook(context)) {
    await input.repository.markWebhookAttempt?.({
      context,
      status: "IGNORED",
      reason: "channel_not_connected",
    });
    return {
      status: 200,
      body: { ok: true, ignored: true, reason: "channel_not_connected" },
    };
  }

  const providerConfig = readMetaChannelProviderConfig(context.channel.config);
  const appSecret = input.appSecret ?? providerConfig.appSecret;

  if (!appSecret || !verifyMetaSignature(appSecret, input.rawBody, input.signatureHeader)) {
    await input.repository.markWebhookAttempt?.({
      context,
      status: "FAILED",
      reason: "invalid_signature",
    });
    return {
      status: 401,
      body: { ok: false, reason: "invalid_signature" },
    };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(input.rawBody);
  } catch {
    await input.repository.markWebhookAttempt?.({
      context,
      status: "IGNORED",
      reason: "invalid_json",
    });
    return {
      status: 200,
      body: { ok: true, ignored: true, reason: "invalid_json" },
    };
  }

  let message = input.parseMessage({
    globalTenantId: context.globalTenantId,
    payload,
  });

  if (!message) {
    await input.repository.markWebhookAttempt?.({
      context,
      status: "IGNORED",
      reason: "message_not_found",
    });
    return {
      status: 200,
      body: { ok: true, ignored: true },
    };
  }

  if (input.channelType === "WHATSAPP" && message.customerContact && input.repository.findTrainerPhone && input.repository.persistTrainerInstruction) {
    const trainer = await input.repository.findTrainerPhone(context.globalTenantId, normalizeTrainerPhone(message.customerContact)).catch(() => null);
      if (trainer) {
        if (message.messageType === "audio" && message.mediaId && input.repository.enqueueTrainerAudio) {
          await input.repository.enqueueTrainerAudio({ context, trainerPhoneId: trainer.id, message });
          await input.repository.sendTrainerReply?.({ context, trainerPhoneId: trainer.id, text: "Recibí el audio. Lo estoy transcribiendo para preparar una propuesta de conocimiento." }).catch(() => undefined);
          await input.repository.markWebhookAttempt?.({ context, status: "PROCESSED", reason: "knowledge_trainer_audio" });
          return { status: 200, body: { ok: true, processed: true, trainer: true } } as ChannelWebhookPostResult;
        }
        const stored = await input.repository.persistTrainerInstruction({ context, trainerPhoneId: trainer.id, message });
        await input.repository.sendTrainerReply?.({ context, trainerPhoneId: trainer.id, text: stored.replyText }).catch(() => undefined);
      await input.repository.markWebhookAttempt?.({ context, status: "PROCESSED", reason: "knowledge_trainer" });
      return { status: 200, body: { ok: true, processed: true, trainer: true, proposalId: stored.proposalId } } as ChannelWebhookPostResult;
    }
  }

  if (!message.customerName && input.resolveCustomerName) {
    const customerName = await input.resolveCustomerName({ context, message }).catch(() => null);
    if (customerName) message = { ...message, customerName };
  }

  const event = await input.repository.markWebhookEventProcessing?.({
    context,
    providerEventId: message.externalMessageId,
    providerMessageId: message.externalMessageId,
    rawPayload: message.rawPayload,
  });

  if (event?.duplicate) {
    await input.repository.markWebhookAttempt?.({
      context,
      status: "IGNORED",
      reason: "duplicate",
    });
    return {
      status: 200,
      body: { ok: true, processed: false, reason: "duplicate" },
    };
  }

  const humanHandoffRequested = detectHumanHandoffIntent(message.text);
  const aiBlockedReason = humanHandoffRequested
    ? "HANDOFF_REQUESTED"
    : resolveAiBlockedReason(context.entitlement, input.channelType);
  let aiReplyError: string | null = null;
  let persisted: PersistChannelInboundMessageResult;
  try {
    persisted = await input.repository.persistInboundMessage({
      context,
      message,
      aiBlockedReason,
    });
    await input.repository.markWebhookEventProcessed?.({
      context,
      providerMessageId: message.externalMessageId,
      conversationId: persisted.conversationId,
      messageId: persisted.messageId,
    });
    if (humanHandoffRequested) {
      await input.repository.requestHumanHandoff?.({
        context,
        conversationId: persisted.conversationId,
        messageId: persisted.messageId,
        reason: "El cliente pidio hablar con un humano.",
        source: "customer_intent",
      });
      persisted = { ...persisted, handoffActive: true };
    }
    const audioQueued =
      message.messageType === "audio"
      && Boolean(message.mediaId)
      && !aiBlockedReason
      && !persisted.handoffActive
      && Boolean(input.repository.enqueueAudioTranscription);
    if (audioQueued) {
      try {
        await input.repository.enqueueAudioTranscription?.({
          context,
          conversationId: persisted.conversationId,
          messageId: persisted.messageId,
          providerMediaId: message.mediaId!,
          mimeType: message.mediaMimeType ?? null,
        });
      } catch {
        aiReplyError = "AUDIO_TRANSCRIPTION_ENQUEUE_FAILED";
        await input.repository.markAiReplyFailed?.({
          context,
          conversationId: persisted.conversationId,
          messageId: persisted.messageId,
          reason: aiReplyError,
        });
      }
    } else {
      try {
        await input.repository.enqueueConversationAnalysis({
          conversationId: persisted.conversationId,
          messageId: persisted.messageId,
          messageCreatedAt: persisted.messageCreatedAt,
        });
        try {
          await input.repository.markConversationAnalysisEnqueued?.({
            context,
            conversationId: persisted.conversationId,
            messageId: persisted.messageId,
          });
        } catch {
          // The durable message marker lets the worker sweep finish cleanup.
        }
      } catch {
        try {
          await input.repository.markConversationAnalysisEnqueueFailed?.({
            context,
            conversationId: persisted.conversationId,
            messageId: persisted.messageId,
            reason: "CONVERSATION_ANALYSIS_ENQUEUE_FAILED",
          });
        } catch {
          // The inbound is durable; keep Meta acknowledgement stable.
        }
      }
    }
    if (!audioQueued && !aiBlockedReason && !persisted.handoffActive && input.runAiReply) {
      try {
        await input.runAiReply({ context, message, persisted });
      } catch (error) {
        aiReplyError = error instanceof Error ? error.message : "AI_REPLY_FAILED";
        await input.repository.markAiReplyFailed?.({
          context,
          conversationId: persisted.conversationId,
          messageId: persisted.messageId,
          reason: aiReplyError,
        });
        // Keep webhook acknowledgement stable after the inbound message is persisted.
      }
    }
    await input.repository.markWebhookAttempt?.({
      context,
      status: aiReplyError ? "FAILED" : "PROCESSED",
      reason: aiReplyError,
    });
  } catch (error) {
    await input.repository.markWebhookEventFailed?.({
      context,
      providerMessageId: message.externalMessageId,
      reason: error instanceof Error ? error.message : "PERSIST_FAILED",
    });
    await input.repository.markWebhookAttempt?.({
      context,
      status: "FAILED",
      reason: error instanceof Error ? error.message : "PERSIST_FAILED",
    });
    throw error;
  }

  return {
    status: 200,
    body: {
      ok: true,
      processed: true,
      conversationId: persisted.conversationId,
      messageId: persisted.messageId,
      aiBlockedReason,
      aiReplyError,
      humanHandoffRequested,
    },
  };
}
