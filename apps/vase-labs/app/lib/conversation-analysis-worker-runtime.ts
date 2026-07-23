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

export function createConversationAnalysisWorkerRuntime(dependencies: {
  recover(): Promise<{ recovered: number; failed: number }>;
  recoveryEveryPolls?: number;
  runBatch(input: { shouldStop: () => boolean }): Promise<ConversationAnalysisBatchMetrics>;
  clock(): number;
  random(): number;
  wait(delayMs: number): Promise<void>;
  info(entry: ConversationAnalysisBatchLog): void;
  error(entry: ErrorLog): void;
}) {
  const recoveryEveryPolls = Math.max(
    1,
    Math.min(1_000, Math.floor(dependencies.recoveryEveryPolls ?? 30)),
  );
  let pollCount = 0;
  return {
    async pollOnce(input: {
      shouldStop: () => boolean;
    }): Promise<ConversationAnalysisBatchLog | ErrorLog> {
      const startedAt = dependencies.clock();
      const runRecovery = pollCount % recoveryEveryPolls === 0;
      pollCount += 1;
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
        const metrics: ConversationAnalysisBatchLog = {
          event: "conversation_analysis_batch",
          recovered: recovery.recovered,
          recoveryFailed: recovery.failed,
          ...(recoveryErrorCode ? { recoveryErrorCode } : {}),
          ...batch,
          latencyMs: Math.max(0, dependencies.clock() - startedAt),
        };
        dependencies.info(metrics);
        if (!input.shouldStop()) {
          await dependencies.wait(calculateConversationAnalysisPollDelay({
            claimed: batch.claimed,
            random: dependencies.random(),
          }));
        }
        return metrics;
      } catch {
        const metrics: ErrorLog = {
          event: "conversation_analysis_worker_error",
          errorCode: "CONVERSATION_ANALYSIS_WORKER_FAILED",
          latencyMs: Math.max(0, dependencies.clock() - startedAt),
        };
        dependencies.error(metrics);
        if (!input.shouldStop()) {
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
