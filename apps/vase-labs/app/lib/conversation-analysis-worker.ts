import type { LabsChannel } from "@vase/contracts";
import type {
  ConversationAnalysisCompletion,
  ConversationAnalysisFailure,
  ConversationAnalysisJob,
} from "./conversation-analysis-queue";
import {
  resolveConversationIntentLabel,
  type ConversationInsightSettings,
  type ParsedConversationInsight,
} from "./conversation-insight";
import type {
  ConversationInsightMessage,
  GeneratedConversationInsight,
} from "./conversation-insight-generator";

export type ConversationAnalysisContext = {
  conversationId: string;
  assistantId: string;
  globalTenantId: string;
  channel: LabsChannel | null;
  assistantModel: string | null;
  openAiApiKey: string | null;
  settings: ConversationInsightSettings;
  activeHandoff: boolean;
  requestedHandoff: boolean;
  messages: ConversationInsightMessage[];
};

export type ConversationInsightPublication = {
  conversationId: string;
  assistantId: string;
  globalTenantId: string;
  analysisVersion: number;
  analyzedThroughMessageId: string;
  analyzedAt: Date;
  insight: ParsedConversationInsight;
};

type Queue = {
  claimNext(): Promise<ConversationAnalysisJob | null>;
  complete(input: {
    conversationId: string;
    leaseToken: string;
    analyzedThroughMessageId: string;
    publish: () => Promise<void>;
  }): Promise<ConversationAnalysisCompletion>;
  fail(input: {
    conversationId: string;
    leaseToken: string;
    error: unknown;
  }): Promise<ConversationAnalysisFailure>;
};

type Repository = {
  loadAnalysisContext(input: {
    conversationId: string;
    requestedThroughMessageId: string;
  }): Promise<ConversationAnalysisContext | null>;
  publishInsight(input: ConversationInsightPublication): Promise<void>;
};

type Generator = {
  generate(input: {
    messages: ConversationInsightMessage[];
    settings: ConversationInsightSettings;
  }): Promise<GeneratedConversationInsight>;
};

export type ConversationAnalysisJobMetrics = {
  inputTokens: number;
  outputTokens: number;
  analysisVersion: number;
  queueAgeMs: number;
  attempt: number;
  latencyMs: number;
};

export type ConversationAnalysisProcessResult =
  | { status: "IDLE" }
  | ({
      status: ConversationAnalysisCompletion | ConversationAnalysisFailure;
      conversationId: string;
      errorCode?: string;
    } & ConversationAnalysisJobMetrics);

export function createConversationAnalysisWorker(dependencies: {
  queue: Queue;
  repository: Repository;
  createGenerator(input: { apiKey?: string }): Generator;
  registerTokenUsage(input: {
    globalTenantId: string;
    channel: LabsChannel;
    inputTokens: number;
    outputTokens: number;
    conversationId: string;
    assistantId: string;
    source: "conversation_analysis";
  }): Promise<{ totalTokens: number }>;
  clock: () => Date;
}) {
  return {
    async processNext(): Promise<ConversationAnalysisProcessResult> {
      const job = await dependencies.queue.claimNext();
      if (!job) return { status: "IDLE" };
      const leaseToken = job.leaseToken;
      if (!leaseToken) {
        throw new Error("CONVERSATION_ANALYSIS_LEASE_MISSING");
      }
      const startedAt = dependencies.clock();
      const queueAgeMs = Math.max(
        0,
        startedAt.getTime() - job.requestedAt.getTime(),
      );
      let inputTokens = 0;
      let outputTokens = 0;
      let analysisVersion = 0;
      const metrics = (): ConversationAnalysisJobMetrics => ({
        inputTokens,
        outputTokens,
        analysisVersion,
        queueAgeMs,
        attempt: job.attempts,
        latencyMs: Math.max(0, dependencies.clock().getTime() - startedAt.getTime()),
      });

      try {
        const context = await dependencies.repository.loadAnalysisContext({
          conversationId: job.conversationId,
          requestedThroughMessageId: job.requestedThroughMessageId,
        });
        if (!context || context.conversationId !== job.conversationId) {
          throw new Error("CONVERSATION_ANALYSIS_CONTEXT_NOT_FOUND");
        }
        analysisVersion = context.settings.version;
        const messages = [...context.messages].sort((left, right) =>
          left.createdAt.getTime() - right.createdAt.getTime()
          || left.id.localeCompare(right.id),
        );
        const generated = await dependencies.createGenerator({
          apiKey: context.openAiApiKey ?? undefined,
        }).generate({ messages, settings: context.settings });
        inputTokens = generated.inputTokens;
        outputTokens = generated.outputTokens;

        if (context.channel) {
          await dependencies.registerTokenUsage({
            globalTenantId: context.globalTenantId,
            channel: context.channel,
            inputTokens: generated.inputTokens,
            outputTokens: generated.outputTokens,
            conversationId: context.conversationId,
            assistantId: context.assistantId,
            source: "conversation_analysis",
          });
        }

        const insight: ParsedConversationInsight = {
          ...generated.insight,
          intentLabel: resolveConversationIntentLabel({
            modelLabel: generated.insight.intentLabel,
            leadScore: generated.insight.leadScore,
            hotLeadThreshold: context.settings.hotLeadThreshold,
            activeHandoff: context.activeHandoff,
            requestedHandoff: context.requestedHandoff,
          }),
        };
        const status = await dependencies.queue.complete({
          conversationId: job.conversationId,
          leaseToken,
          analyzedThroughMessageId: job.requestedThroughMessageId,
          publish: () => dependencies.repository.publishInsight({
            conversationId: context.conversationId,
            assistantId: context.assistantId,
            globalTenantId: context.globalTenantId,
            analysisVersion: context.settings.version,
            analyzedThroughMessageId: job.requestedThroughMessageId,
            analyzedAt: dependencies.clock(),
            insight,
          }),
        });
        return { status, conversationId: job.conversationId, ...metrics() };
      } catch {
        const errorCode = "CONVERSATION_ANALYSIS_FAILED";
        const status = await dependencies.queue.fail({
          conversationId: job.conversationId,
          leaseToken,
          error: errorCode,
        });
        return {
          status,
          conversationId: job.conversationId,
          errorCode,
          ...metrics(),
        };
      }
    },
  };
}

export const MAX_CONVERSATION_ANALYSIS_BATCH_SIZE = 100;

export function resolveConversationAnalysisBatchSize(
  raw: string | number | undefined,
  fallback: number,
): number {
  const fallbackValue = Number.isFinite(fallback) && fallback >= 1
    ? Math.floor(fallback)
    : 10;
  const parsed = typeof raw === "number" ? raw : Number(raw);
  const resolved = Number.isFinite(parsed) && parsed >= 1
    ? Math.floor(parsed)
    : fallbackValue;
  return Math.min(MAX_CONVERSATION_ANALYSIS_BATCH_SIZE, resolved);
}

export type ConversationAnalysisBatchMetrics = {
  claimed: number;
  completed: number;
  requeued: number;
  failed: number;
  leaseLost: number;
  errorCodes: string[];
  inputTokens: number;
  outputTokens: number;
  analysisVersions: number[];
  maxQueueAgeMs: number;
  maxAttempt: number;
  jobLatencyMs: number;
};

export async function runConversationAnalysisBatch(input: {
  worker: { processNext(): Promise<ConversationAnalysisProcessResult> };
  maxJobs: number;
  shouldStop?: () => boolean;
}): Promise<ConversationAnalysisBatchMetrics> {
  const counts: ConversationAnalysisBatchMetrics = {
    claimed: 0,
    completed: 0,
    requeued: 0,
    failed: 0,
    leaseLost: 0,
    errorCodes: [],
    inputTokens: 0,
    outputTokens: 0,
    analysisVersions: [],
    maxQueueAgeMs: 0,
    maxAttempt: 0,
    jobLatencyMs: 0,
  };
  const maxJobs = resolveConversationAnalysisBatchSize(input.maxJobs, 10);
  for (let index = 0; index < maxJobs; index += 1) {
    if (input.shouldStop?.()) break;
    const result = await input.worker.processNext();
    if (result.status === "IDLE") break;
    counts.claimed += 1;
    if (result.status === "COMPLETED") counts.completed += 1;
    if (result.status === "REQUEUED" || result.status === "RETRY_QUEUED") counts.requeued += 1;
    if (result.status === "FAILED") counts.failed += 1;
    if (result.status === "LEASE_LOST") counts.leaseLost += 1;
    if (result.errorCode) counts.errorCodes.push(result.errorCode);
    counts.inputTokens += result.inputTokens;
    counts.outputTokens += result.outputTokens;
    if (
      result.analysisVersion > 0
      && !counts.analysisVersions.includes(result.analysisVersion)
    ) {
      counts.analysisVersions.push(result.analysisVersion);
    }
    counts.maxQueueAgeMs = Math.max(counts.maxQueueAgeMs, result.queueAgeMs);
    counts.maxAttempt = Math.max(counts.maxAttempt, result.attempt);
    counts.jobLatencyMs += result.latencyMs;
  }
  return counts;
}

export type FailedConversationAnalysisEnqueue = {
  conversationId: string;
  assistantId: string;
  messageId: string;
  messageCreatedAt: Date;
};

export async function recoverConversationAnalysisEnqueues(input: {
  repository: {
    listFailedEnqueueCandidates(limit: number): Promise<FailedConversationAnalysisEnqueue[]>;
    clearFailedEnqueueMarker(candidate: Omit<
      FailedConversationAnalysisEnqueue,
      "messageCreatedAt"
    >): Promise<void>;
  };
  enqueue(request: {
    conversationId: string;
    requestedThroughMessageId: string;
    requestedThroughMessageCreatedAt: Date;
  }): Promise<unknown>;
  limit: number;
}) {
  const candidates = await input.repository.listFailedEnqueueCandidates(input.limit);
  let recovered = 0;
  let failed = 0;
  for (const candidate of candidates) {
    try {
      await input.enqueue({
        conversationId: candidate.conversationId,
        requestedThroughMessageId: candidate.messageId,
        requestedThroughMessageCreatedAt: candidate.messageCreatedAt,
      });
      await input.repository.clearFailedEnqueueMarker({
        conversationId: candidate.conversationId,
        assistantId: candidate.assistantId,
        messageId: candidate.messageId,
      });
      recovered += 1;
    } catch {
      failed += 1;
    }
  }
  return { recovered, failed };
}
