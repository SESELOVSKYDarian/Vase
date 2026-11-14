// Parte de conversation-analysis-worker.ts: resolveConversationAnalysisTimingConfig, MAX_CONVERSATION_ANALYSIS_BATCH_SIZE, resolveConversationAnalysisBatchSize, ConversationAnalysisBatchMetrics, runConversationAnalysisBatch, FailedConversationAnalysisEnqueue y más.
import { ConversationAnalysisProcessResult, ConversationAnalysisTimingConfig } from "./create-conversation-analysis-worker";

export function resolveConversationAnalysisTimingConfig(input: {
  leaseDurationMs?: string | number;
  requestTimeoutMs?: string | number;
  heartbeatIntervalMs?: string | number;
}): ConversationAnalysisTimingConfig {
  const parse = (value: string | number | undefined, fallback: number) =>
    value === undefined ? fallback : Number(value);
  const leaseDurationMs = parse(input.leaseDurationMs, 60_000);
  const requestTimeoutMs = parse(input.requestTimeoutMs, 45_000);
  const heartbeatIntervalMs = parse(input.heartbeatIntervalMs, 15_000);
  if (
    !Number.isFinite(leaseDurationMs)
    || !Number.isFinite(requestTimeoutMs)
    || !Number.isFinite(heartbeatIntervalMs)
    || leaseDurationMs < 10_000
    || leaseDurationMs > 600_000
    || requestTimeoutMs < 1_000
    || requestTimeoutMs > leaseDurationMs - 5_000
    || heartbeatIntervalMs < 1_000
    || heartbeatIntervalMs >= leaseDurationMs / 2
  ) {
    throw new Error("INVALID_CONVERSATION_ANALYSIS_TIMING_CONFIG");
  }
  return {
    leaseDurationMs: Math.floor(leaseDurationMs),
    requestTimeoutMs: Math.floor(requestTimeoutMs),
    heartbeatIntervalMs: Math.floor(heartbeatIntervalMs),
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
  worker: { processNext(input?: { signal?: AbortSignal }): Promise<ConversationAnalysisProcessResult> };
  maxJobs: number;
  shouldStop?: () => boolean;
  signal?: AbortSignal;
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
    const result = await input.worker.processNext({ signal: input.signal });
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
