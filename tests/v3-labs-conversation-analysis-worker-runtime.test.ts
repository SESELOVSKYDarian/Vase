import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  calculateConversationAnalysisPollDelay,
  createConversationAnalysisWorkerRuntime,
} from "../apps/vase-labs/app/lib/conversation-analysis-worker-runtime";

describe("conversation analysis worker runtime", () => {
  it("logs required safe batch metrics and waits with bounded jitter", async () => {
    const logs: unknown[] = [];
    const wait = vi.fn(async () => undefined);
    const clock = vi.fn()
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(1_125);
    const runtime = createConversationAnalysisWorkerRuntime({
      recover: async () => ({ recovered: 2, failed: 1 }),
      runBatch: async () => ({
        claimed: 2,
        completed: 1,
        requeued: 1,
        failed: 0,
        leaseLost: 0,
        errorCodes: ["CONVERSATION_ANALYSIS_FAILED"],
        inputTokens: 17,
        outputTokens: 8,
        analysisVersions: [3],
        maxQueueAgeMs: 45_000,
        maxAttempt: 2,
        jobLatencyMs: 90,
      }),
      clock,
      random: () => 0.5,
      wait,
      info: (entry) => logs.push(entry),
      error: (entry) => logs.push(entry),
    });

    const metrics = await runtime.pollOnce({ shouldStop: () => false });

    expect(metrics).toEqual({
      event: "conversation_analysis_batch",
      recovered: 2,
      recoveryFailed: 1,
      claimed: 2,
      completed: 1,
      requeued: 1,
      failed: 0,
      leaseLost: 0,
      errorCodes: ["CONVERSATION_ANALYSIS_FAILED"],
      inputTokens: 17,
      outputTokens: 8,
      analysisVersions: [3],
      maxQueueAgeMs: 45_000,
      maxAttempt: 2,
      jobLatencyMs: 90,
      latencyMs: 125,
    });
    expect(logs).toEqual([metrics]);
    expect(wait).toHaveBeenCalledWith(calculateConversationAnalysisPollDelay({
      claimed: 2,
      random: 0.5,
    }));
    expect(JSON.stringify(logs)).not.toContain("transcript");
    expect(JSON.stringify(logs)).not.toContain("apiKey");
  });

  it("does not wait for another poll after termination is requested", async () => {
    const wait = vi.fn(async () => undefined);
    const runtime = createConversationAnalysisWorkerRuntime({
      recover: async () => ({ recovered: 0, failed: 0 }),
      runBatch: async () => ({
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
      }),
      clock: () => 1,
      random: () => 0,
      wait,
      info: vi.fn(),
      error: vi.fn(),
    });

    await runtime.pollOnce({ shouldStop: () => true });
    expect(wait).not.toHaveBeenCalled();
  });

  it("isolates recovery failures so analysis batches still run", async () => {
    const logs: unknown[] = [];
    const runBatch = vi.fn(async () => ({
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
    }));
    const runtime = createConversationAnalysisWorkerRuntime({
      recover: async () => {
        throw new Error("transcript and apiKey provider body");
      },
      runBatch,
      clock: () => 100,
      random: () => 0,
      wait: async () => undefined,
      info: (entry) => logs.push(entry),
      error: vi.fn(),
    });

    await runtime.pollOnce({ shouldStop: () => true });

    expect(runBatch).toHaveBeenCalledOnce();
    expect(logs).toEqual([expect.objectContaining({
      event: "conversation_analysis_batch",
      recovered: 0,
      recoveryFailed: 1,
      recoveryErrorCode: "CONVERSATION_ANALYSIS_RECOVERY_FAILED",
      latencyMs: 0,
    })]);
    expect(JSON.stringify(logs)).not.toContain("transcript");
    expect(JSON.stringify(logs)).not.toContain("apiKey");
    expect(JSON.stringify(logs)).not.toContain("provider body");
  });

  it("runs indexed recovery by elapsed time instead of poll count", async () => {
    let now = 0;
    const recover = vi.fn(async () => ({ recovered: 0, failed: 0 }));
    const runtime = createConversationAnalysisWorkerRuntime({
      recover,
      recoveryIntervalMs: 5_000,
      runBatch: async () => ({
        claimed: 0, completed: 0, requeued: 0, failed: 0, leaseLost: 0,
        errorCodes: [], inputTokens: 0, outputTokens: 0, analysisVersions: [],
        maxQueueAgeMs: 0, maxAttempt: 0, jobLatencyMs: 0,
      }),
      clock: () => now,
      random: () => 0,
      wait: async () => undefined,
      info: vi.fn(),
      error: vi.fn(),
    });

    for (let index = 0; index < 10; index += 1) {
      await runtime.pollOnce({ shouldStop: () => true });
      now += 100;
    }
    expect(recover).toHaveBeenCalledTimes(1);

    now = 5_000;
    await runtime.pollOnce({ shouldStop: () => true });
    expect(recover).toHaveBeenCalledTimes(2);
  });

  it("recovers immediately after one active batch of ten slow jobs crosses the interval", async () => {
    let now = 0;
    let batch = 0;
    const recover = vi.fn(async () => ({ recovered: 0, failed: 0 }));
    const wait = vi.fn(async () => undefined);
    const runtime = createConversationAnalysisWorkerRuntime({
      recover,
      recoveryIntervalMs: 5_000,
      runBatch: async () => {
        if (batch === 0) {
          for (let job = 0; job < 10; job += 1) now += 1_000;
        }
        batch += 1;
        return {
          claimed: 10, completed: 10, requeued: 0, failed: 0, leaseLost: 0,
          errorCodes: [], inputTokens: 0, outputTokens: 0, analysisVersions: [],
          maxQueueAgeMs: 0, maxAttempt: 1, jobLatencyMs: 10_000,
        };
      },
      clock: () => now,
      random: () => 0,
      wait,
      info: vi.fn(),
      error: vi.fn(),
    });

    await runtime.pollOnce({ shouldStop: () => false });
    expect(wait).not.toHaveBeenCalled();
    await runtime.pollOnce({ shouldStop: () => true });

    expect(recover).toHaveBeenCalledTimes(2);
  });

  it("validates recovery interval bounds", () => {
    const dependencies = {
      recover: async () => ({ recovered: 0, failed: 0 }),
      runBatch: async () => ({
        claimed: 0, completed: 0, requeued: 0, failed: 0, leaseLost: 0,
        errorCodes: [], inputTokens: 0, outputTokens: 0, analysisVersions: [],
        maxQueueAgeMs: 0, maxAttempt: 0, jobLatencyMs: 0,
      }),
      clock: () => 0,
      random: () => 0,
      wait: async () => undefined,
      info: vi.fn(),
      error: vi.fn(),
    };

    expect(() => createConversationAnalysisWorkerRuntime({
      ...dependencies,
      recoveryIntervalMs: 999,
    })).toThrow("INVALID_CONVERSATION_ANALYSIS_RECOVERY_INTERVAL");
    expect(() => createConversationAnalysisWorkerRuntime({
      ...dependencies,
      recoveryIntervalMs: 3_600_001,
    })).toThrow("INVALID_CONVERSATION_ANALYSIS_RECOVERY_INTERVAL");
    expect(() => createConversationAnalysisWorkerRuntime({
      ...dependencies,
      recoveryIntervalMs: Number.NaN,
    })).toThrow("INVALID_CONVERSATION_ANALYSIS_RECOVERY_INTERVAL");
    expect(() => createConversationAnalysisWorkerRuntime({
      ...dependencies,
      recoveryIntervalMs: 1_000,
    })).not.toThrow();
  });

  it("injects a monotonic production clock", () => {
    const source = readFileSync(
      "apps/vase-labs/scripts/conversation-analysis-worker.ts",
      "utf8",
    );
    expect(source).toContain('from "node:perf_hooks"');
    expect(source).toContain("clock: () => performance.now()");
    expect(source).not.toContain("clock: Date.now");
  });

  it("uses longer jittered polling delays for idle queues", () => {
    expect(calculateConversationAnalysisPollDelay({ claimed: 0, random: 0 }))
      .toBe(1_000);
    expect(calculateConversationAnalysisPollDelay({ claimed: 0, random: 0.999 }))
      .toBeLessThanOrEqual(1_250);
    expect(calculateConversationAnalysisPollDelay({ claimed: 1, random: 0 }))
      .toBe(100);
  });
});
