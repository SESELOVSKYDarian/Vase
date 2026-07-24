import type { ConversationAnalysisBatchMetrics } from "./conversation-analysis-worker";

export type ConversationAnalysisBatchLog = ConversationAnalysisBatchMetrics & {
  event: "conversation_analysis_batch";
  recovered: number;
  recoveryFailed: number;
  recoveryErrorCode?: "CONVERSATION_ANALYSIS_RECOVERY_FAILED";
  latencyMs: number;
};

type ErrorLog = {
  event: "conversation_analysis_worker_error";
  errorCode: "CONVERSATION_ANALYSIS_WORKER_FAILED";
  latencyMs: number;
};

export function calculateConversationAnalysisPollDelay(input: {
  claimed: number;
  random: number;
}): number {
  const baseMs = input.claimed === 0 ? 1_000 : 100;
  const boundedRandom = Math.min(0.999_999, Math.max(0, input.random));
  return baseMs + Math.floor(boundedRandom * Math.max(1, Math.floor(baseMs / 4)));
}

export function resolveConversationAnalysisRecoveryIntervalMs(
  value: string | number | undefined,
): number {
  const parsed = value === undefined ? 30_000 : Number(value);
  if (!Number.isFinite(parsed) || parsed < 1_000 || parsed > 3_600_000) {
    throw new Error("INVALID_CONVERSATION_ANALYSIS_RECOVERY_INTERVAL");
  }
  return Math.floor(parsed);
}

export function createConversationAnalysisWorkerRuntime(dependencies: {
  recover(): Promise<{ recovered: number; failed: number }>;
  recoveryIntervalMs?: string | number;
  runBatch(input: { shouldStop: () => boolean }): Promise<ConversationAnalysisBatchMetrics>;
  clock(): number;
  random(): number;
  wait(delayMs: number): Promise<void>;
  info(entry: ConversationAnalysisBatchLog): void;
  error(entry: ErrorLog): void;
}) {
  const recoveryIntervalMs = resolveConversationAnalysisRecoveryIntervalMs(
    dependencies.recoveryIntervalMs,
  );
  let nextRecoveryAt: number | null = null;
  let lastClockValue = Number.NEGATIVE_INFINITY;
  const monotonicNow = () => {
    lastClockValue = Math.max(lastClockValue, dependencies.clock());
    return lastClockValue;
  };
  return {
    async pollOnce(input: {
      shouldStop: () => boolean;
    }): Promise<ConversationAnalysisBatchLog | ErrorLog> {
      const startedAt = monotonicNow();
      const runRecovery = nextRecoveryAt === null || startedAt >= nextRecoveryAt;
      if (runRecovery) nextRecoveryAt = startedAt + recoveryIntervalMs;
      try {
        let recovery = { recovered: 0, failed: 0 };
        let recoveryErrorCode: ConversationAnalysisBatchLog["recoveryErrorCode"];
        if (runRecovery) {
          try {
            recovery = await dependencies.recover();
          } catch {
            recovery = { recovered: 0, failed: 1 };
            recoveryErrorCode = "CONVERSATION_ANALYSIS_RECOVERY_FAILED";
          }
        }
        const batch = await dependencies.runBatch({
          shouldStop: input.shouldStop,
        });
        const finishedAt = monotonicNow();
        const metrics: ConversationAnalysisBatchLog = {
          event: "conversation_analysis_batch",
          recovered: recovery.recovered,
          recoveryFailed: recovery.failed,
          ...(recoveryErrorCode ? { recoveryErrorCode } : {}),
          ...batch,
          latencyMs: Math.max(0, finishedAt - startedAt),
        };
        dependencies.info(metrics);
        const recoveryOverdue = nextRecoveryAt !== null && finishedAt >= nextRecoveryAt;
        if (!input.shouldStop() && !recoveryOverdue) {
          await dependencies.wait(calculateConversationAnalysisPollDelay({
            claimed: batch.claimed,
            random: dependencies.random(),
          }));
        }
        return metrics;
      } catch {
        const finishedAt = monotonicNow();
        const metrics: ErrorLog = {
          event: "conversation_analysis_worker_error",
          errorCode: "CONVERSATION_ANALYSIS_WORKER_FAILED",
          latencyMs: Math.max(0, finishedAt - startedAt),
        };
        dependencies.error(metrics);
        const recoveryOverdue = nextRecoveryAt !== null && finishedAt >= nextRecoveryAt;
        if (!input.shouldStop() && !recoveryOverdue) {
          await dependencies.wait(calculateConversationAnalysisPollDelay({
            claimed: 0,
            random: dependencies.random(),
          }));
        }
        return metrics;
      }
    },

    async run(input: { shouldStop: () => boolean }): Promise<void> {
      while (!input.shouldStop()) {
        await this.pollOnce(input);
      }
    },
  };
}
