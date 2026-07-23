import { randomUUID } from "node:crypto";
import { createConversationAnalysisQueue } from "../app/lib/conversation-analysis-queue";
import { PrismaConversationAnalysisRepository } from "../app/lib/conversation-analysis-repository";
import {
  createConversationAnalysisWorker,
  recoverConversationAnalysisEnqueues,
  resolveConversationAnalysisBatchSize,
  runConversationAnalysisBatch,
} from "../app/lib/conversation-analysis-worker";
import { createConversationAnalysisWorkerRuntime } from "../app/lib/conversation-analysis-worker-runtime";
import { createConversationInsightGenerator } from "../app/lib/conversation-insight-generator";
import { labsPrisma } from "../app/lib/db";
import { labsEntitlementsService } from "../app/lib/labs-entitlements-service";

const maxAttempts = positiveInteger(process.env.CONVERSATION_ANALYSIS_MAX_ATTEMPTS, 3);
const leaseDurationMs = positiveInteger(
  process.env.CONVERSATION_ANALYSIS_LEASE_DURATION_MS,
  60_000,
);
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
  leaseDurationMs,
  claimBatchSize: batchSize,
});
const worker = createConversationAnalysisWorker({
  queue,
  repository,
  createGenerator({ apiKey }) {
    return createConversationInsightGenerator({
      apiKey,
      env: process.env,
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
});

let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    stopping = true;
  });
}

const runtime = createConversationAnalysisWorkerRuntime({
  recover() {
    return recoverConversationAnalysisEnqueues({
      repository,
      enqueue: queue.enqueue,
      limit: batchSize,
    });
  },
  runBatch({ shouldStop }) {
    return runConversationAnalysisBatch({
      worker,
      maxJobs: batchSize,
      shouldStop,
    });
  },
  clock: Date.now,
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
