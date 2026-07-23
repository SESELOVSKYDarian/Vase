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

  it("reduces runtime failures to a safe structured error log", async () => {
    const errors: unknown[] = [];
    const runtime = createConversationAnalysisWorkerRuntime({
      recover: async () => {
        throw new Error("transcript and apiKey provider body");
      },
      runBatch: vi.fn(),
      clock: () => 100,
      random: () => 0,
      wait: async () => undefined,
      info: vi.fn(),
      error: (entry) => errors.push(entry),
    });

    await runtime.pollOnce({ shouldStop: () => true });

    expect(errors).toEqual([{
      event: "conversation_analysis_worker_error",
      errorCode: "CONVERSATION_ANALYSIS_WORKER_FAILED",
      latencyMs: 0,
    }]);
    expect(JSON.stringify(errors)).not.toContain("transcript");
    expect(JSON.stringify(errors)).not.toContain("apiKey");
    expect(JSON.stringify(errors)).not.toContain("provider body");
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
