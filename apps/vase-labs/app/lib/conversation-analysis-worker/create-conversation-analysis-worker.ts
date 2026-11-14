// Parte de conversation-analysis-worker.ts: ConversationAnalysisContext, ConversationInsightPublication, Queue, Repository, Generator, Heartbeat y más.
import { type LabsChannel } from "@vase/contracts";
import { type ConversationAnalysisCompletion, type ConversationAnalysisFailure, type ConversationAnalysisJob, type ConversationAnalysisLeaseRenewal } from "../conversation-analysis-queue";
import { resolveConversationIntentLabel, type ConversationInsightSettings, type ParsedConversationInsight } from "../conversation-insight";
import { type ConversationInsightMessage, type GeneratedConversationInsight } from "../conversation-insight-generator";

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

export type Queue = {
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
  renewLease?(input: {
    conversationId: string;
    leaseToken: string;
  }): Promise<ConversationAnalysisLeaseRenewal>;
};

export type Repository = {
  loadAnalysisContext(input: {
    conversationId: string;
    requestedThroughMessageId: string;
  }): Promise<ConversationAnalysisContext | null>;
  publishInsight(input: ConversationInsightPublication): Promise<void>;
};

export type Generator = {
  generate(input: {
    messages: ConversationInsightMessage[];
    settings: ConversationInsightSettings;
    signal?: AbortSignal;
  }): Promise<GeneratedConversationInsight>;
};

export type Heartbeat = {
  intervalMs: number;
  start(callback: () => void, intervalMs: number): unknown;
  stop(handle: unknown): void;
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
  heartbeat?: Heartbeat;
}) {
  return {
    async processNext(input: {
      signal?: AbortSignal;
    } = {}): Promise<ConversationAnalysisProcessResult> {
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
      const inferenceController = new AbortController();
      const abortInference = () => inferenceController.abort();
      input.signal?.addEventListener("abort", abortInference, { once: true });
      if (input.signal?.aborted) abortInference();
      let heartbeatBusy = false;
      const heartbeatHandle = dependencies.heartbeat && dependencies.queue.renewLease
        ? dependencies.heartbeat.start(() => {
            if (heartbeatBusy) return;
            heartbeatBusy = true;
            void dependencies.queue.renewLease!({
              conversationId: job.conversationId,
              leaseToken,
            }).then((renewal) => {
              if (renewal === "LEASE_LOST") abortInference();
            }).catch(() => {
              abortInference();
            }).finally(() => {
              heartbeatBusy = false;
            });
          }, dependencies.heartbeat.intervalMs)
        : null;
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
        }).generate({
          messages,
          settings: context.settings,
          signal: inferenceController.signal,
        });
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
      } finally {
        input.signal?.removeEventListener("abort", abortInference);
        if (heartbeatHandle !== null && dependencies.heartbeat) {
          dependencies.heartbeat.stop(heartbeatHandle);
        }
      }
    },
  };
}

export type ConversationAnalysisTimingConfig = {
  leaseDurationMs: number;
  requestTimeoutMs: number;
  heartbeatIntervalMs: number;
};
