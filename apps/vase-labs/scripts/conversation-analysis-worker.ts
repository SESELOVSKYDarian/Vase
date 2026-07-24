import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { createConversationAnalysisQueue } from "../app/lib/conversation-analysis-queue";
import { PrismaConversationAnalysisRepository } from "../app/lib/conversation-analysis-repository";
import {
  createConversationAnalysisWorker,
  recoverConversationAnalysisEnqueues,
  resolveConversationAnalysisBatchSize,
  resolveConversationAnalysisTimingConfig,
  runConversationAnalysisBatch,
} from "../app/lib/conversation-analysis-worker";
import { createConversationAnalysisWorkerRuntime } from "../app/lib/conversation-analysis-worker-runtime";
import { createConversationInsightGenerator } from "../app/lib/conversation-insight-generator";
import { labsPrisma } from "../app/lib/db";
import { labsEntitlementsService } from "../app/lib/labs-entitlements-service";
import { PrismaAudioTranscriptionQueue, type ClaimedAudioTranscriptionJob } from "../app/lib/audio-transcription-queue";
import { createAudioTranscriptionClient } from "../app/lib/audio-transcription-client";
import { createAudioTranscriptionWorker } from "../app/lib/audio-transcription-worker";
import { createPrismaChannelAiReplyRunner } from "../app/lib/channel-ai-runner";
import {
  detectHumanHandoffIntent,
  PrismaChannelWebhookRepository,
} from "../app/lib/channel-webhook-service";
import { decryptChannelSecret } from "../app/lib/channel-secrets";
import { PrismaOfficialChannelSenderRepository } from "../app/lib/official-channel-sender-repository";
import { downloadWhatsAppMedia } from "../app/lib/whatsapp-media";
import {
  PrismaAssistantOpenAiKeyRepository,
  resolveAssistantOpenAiApiKey,
} from "../app/lib/assistant-openai-key";

const maxAttempts = positiveInteger(process.env.CONVERSATION_ANALYSIS_MAX_ATTEMPTS, 3);
const timing = resolveConversationAnalysisTimingConfig({
  leaseDurationMs: process.env.CONVERSATION_ANALYSIS_LEASE_DURATION_MS,
  requestTimeoutMs: process.env.CONVERSATION_ANALYSIS_REQUEST_TIMEOUT_MS,
  heartbeatIntervalMs: process.env.CONVERSATION_ANALYSIS_HEARTBEAT_INTERVAL_MS,
});
const batchSize = resolveConversationAnalysisBatchSize(
  process.env.CONVERSATION_ANALYSIS_BATCH_SIZE,
  10,
);
const repository = new PrismaConversationAnalysisRepository(labsPrisma, process.env);
const queue = createConversationAnalysisQueue({
  repository,
  clock: () => new Date(),
  tokenFactory: randomUUID,
  maxAttempts,
  leaseDurationMs: timing.leaseDurationMs,
  claimBatchSize: batchSize,
});
const worker = createConversationAnalysisWorker({
  queue,
  repository,
  createGenerator({ apiKey }) {
    return createConversationInsightGenerator({
      apiKey,
      env: process.env,
      requestTimeoutMs: timing.requestTimeoutMs,
    });
  },
  async registerTokenUsage(usage) {
    const registered = await labsEntitlementsService.registerTokenUsage(
      usage.globalTenantId,
      usage,
    );
    return { totalTokens: registered.usage.totalTokens };
  },
  clock: () => new Date(),
  heartbeat: {
    intervalMs: timing.heartbeatIntervalMs,
    start(callback, intervalMs) {
      return setInterval(callback, intervalMs);
    },
    stop(handle) {
      clearInterval(handle as NodeJS.Timeout);
    },
  },
});
const channelWebhookRepository = new PrismaChannelWebhookRepository(labsPrisma);
const audioQueue = new PrismaAudioTranscriptionQueue(labsPrisma, {
  maxAttempts: positiveInteger(process.env.AUDIO_TRANSCRIPTION_MAX_ATTEMPTS, 3),
  leaseDurationMs: positiveInteger(process.env.AUDIO_TRANSCRIPTION_LEASE_DURATION_MS, 240_000),
});
const channelDeliveryRepository = new PrismaOfficialChannelSenderRepository(labsPrisma);
const assistantOpenAiKeyRepository = new PrismaAssistantOpenAiKeyRepository(labsPrisma);
const runChannelAiReply = createPrismaChannelAiReplyRunner();
const audioWorker = createAudioTranscriptionWorker({
  queue: audioQueue,
  async downloadMedia(rawJob) {
    const job = rawJob as ClaimedAudioTranscriptionJob;
    if (job.channel !== "WHATSAPP") {
      throw new Error("AUDIO_CHANNEL_NOT_SUPPORTED");
    }
    const delivery = await channelDeliveryRepository.findDeliveryContext({
      globalTenantId: job.globalTenantId,
      channelType: job.channel,
    });
    if (!delivery) throw new Error("OFFICIAL_CHANNEL_NOT_CONNECTED");
    const encryptionSecret = process.env.TOKEN_ENCRYPTION_SECRET?.trim();
    if (!encryptionSecret) throw new Error("TOKEN_ENCRYPTION_SECRET_MISSING");
    const accessToken = decryptChannelSecret(
      delivery.encryptedAccessToken,
      encryptionSecret,
    );
    return downloadWhatsAppMedia(
      job.providerMediaId,
      accessToken,
      process.env.META_GRAPH_VERSION?.trim() || "v25.0",
    );
  },
  async resolveTranscriber(rawJob) {
    const job = rawJob as ClaimedAudioTranscriptionJob;
    const apiKey = await resolveAssistantOpenAiApiKey({
      assistantId: job.assistantId,
      encryptionSecret: process.env.TOKEN_ENCRYPTION_SECRET ?? "",
      repository: assistantOpenAiKeyRepository,
    });
    return createAudioTranscriptionClient({
      apiKey,
      model:
        process.env.AI_TRANSCRIPTION_MODEL?.trim()
        || "gpt-4o-mini-transcribe",
      timeoutMs: positiveInteger(
        process.env.AUDIO_TRANSCRIPTION_REQUEST_TIMEOUT_MS,
        120_000,
      ),
    });
  },
  storeTranscript(jobId, transcript) {
    return audioQueue.storeTranscript(jobId, transcript);
  },
  async continueConversation(rawJob, transcript) {
    const job = rawJob as ClaimedAudioTranscriptionJob;
    const continuation = await audioQueue.loadContinuation(job.id);
    const context = await channelWebhookRepository.findContextByTenantSlug(
      continuation.tenantSlug,
      continuation.channel,
    );
    if (!context || context.assistantId !== continuation.assistantId) {
      throw new Error("AUDIO_CONVERSATION_CONTEXT_NOT_FOUND");
    }
    const persisted = {
      conversationId: continuation.conversationId,
      messageId: continuation.messageId,
      messageCreatedAt: continuation.messageCreatedAt,
      aiBlockedReason: null,
      handoffActive: false,
    };
    if (detectHumanHandoffIntent(transcript)) {
      await channelWebhookRepository.requestHumanHandoff({
        context,
        conversationId: continuation.conversationId,
        messageId: continuation.messageId,
        reason: "El cliente pidio hablar con un humano en un audio.",
        source: "customer_intent",
      });
      persisted.handoffActive = true;
    } else {
      const reply = await runChannelAiReply({
        context,
        persisted,
        message: {
          globalTenantId: continuation.globalTenantId,
          channelType: continuation.channel,
          externalThreadKey: continuation.externalThreadKey,
          externalMessageId: continuation.externalMessageId,
          customerName: continuation.customerName,
          customerContact: continuation.customerContact,
          text: transcript,
          messageType: "audio",
          mediaId: continuation.providerMediaId,
          mediaMimeType: continuation.mimeType,
          provider: "META_OFFICIAL",
        },
      });
      if (!reply.ok) throw new Error("AUDIO_AI_REPLY_SKIPPED");
    }

    try {
      await channelWebhookRepository.enqueueConversationAnalysis({
        conversationId: continuation.conversationId,
        messageId: continuation.messageId,
        messageCreatedAt: continuation.messageCreatedAt,
      });
      await channelWebhookRepository.markConversationAnalysisEnqueued({
        context,
        conversationId: continuation.conversationId,
        messageId: continuation.messageId,
      });
    } catch {
      await channelWebhookRepository.markConversationAnalysisEnqueueFailed({
        context,
        conversationId: continuation.conversationId,
        messageId: continuation.messageId,
        reason: "CONVERSATION_ANALYSIS_ENQUEUE_FAILED",
      });
    }
  },
});

let stopping = false;
const shutdownController = new AbortController();
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    stopping = true;
    shutdownController.abort();
  });
}

const runtime = createConversationAnalysisWorkerRuntime({
  recoveryIntervalMs: process.env.CONVERSATION_ANALYSIS_RECOVERY_INTERVAL_MS,
  recover() {
    return recoverConversationAnalysisEnqueues({
      repository,
      enqueue: queue.enqueue,
      limit: batchSize,
    });
  },
  runBatch({ shouldStop }) {
    return runCombinedBatch(shouldStop);
  },
  clock: () => performance.now(),
  random: Math.random,
  wait(delayMs) {
    return new Promise((resolve) => setTimeout(resolve, delayMs));
  },
  info(entry) {
    console.info(JSON.stringify(entry));
  },
  error(entry) {
    console.error(JSON.stringify(entry));
  },
});

function main() {
  return runtime.run({ shouldStop: () => stopping });
}

async function runCombinedBatch(shouldStop: () => boolean) {
  let audioClaimed = 0;
  let audioCompleted = 0;
  let audioFailed = 0;
  for (let index = 0; index < batchSize && !shouldStop(); index += 1) {
    const result = await audioWorker.processNext();
    if (result.status === "IDLE") break;
    audioClaimed += 1;
    if (result.status === "COMPLETED") audioCompleted += 1;
    if (result.status === "FAILED") audioFailed += 1;
  }
  if (audioClaimed > 0) {
    console.info(JSON.stringify({
      event: "audio_transcription_batch",
      claimed: audioClaimed,
      completed: audioCompleted,
      failed: audioFailed,
    }));
  }
  const analysis = await runConversationAnalysisBatch({
    worker,
    maxJobs: batchSize,
    shouldStop,
    signal: shutdownController.signal,
  });
  return {
    ...analysis,
    claimed: analysis.claimed + audioClaimed,
    completed: analysis.completed + audioCompleted,
    failed: analysis.failed + audioFailed,
  };
}

function positiveInteger(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : fallback;
}

void main()
  .catch(() => {
    process.exitCode = 1;
  })
  .finally(async () => {
    await labsPrisma.$disconnect();
  });
