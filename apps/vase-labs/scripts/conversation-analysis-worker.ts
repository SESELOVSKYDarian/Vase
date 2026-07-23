import { randomUUID } from "node:crypto";
import { createConversationAnalysisQueue } from "../app/lib/conversation-analysis-queue";
import { PrismaConversationAnalysisRepository } from "../app/lib/conversation-analysis-repository";
import {
  createConversationAnalysisWorker,
  recoverConversationAnalysisEnqueues,
  runConversationAnalysisBatch,
} from "../app/lib/conversation-analysis-worker";
import { createConversationInsightGenerator } from "../app/lib/conversation-insight-generator";
import { labsPrisma } from "../app/lib/db";
import { labsEntitlementsService } from "../app/lib/labs-entitlements-service";

const maxAttempts = positiveInteger(process.env.CONVERSATION_ANALYSIS_MAX_ATTEMPTS, 3);
const leaseDurationMs = positiveInteger(
  process.env.CONVERSATION_ANALYSIS_LEASE_DURATION_MS,
  60_000,
);
const batchSize = positiveInteger(process.env.CONVERSATION_ANALYSIS_BATCH_SIZE, 10);
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

async function main() {
  while (!stopping) {
    const startedAt = Date.now();
    try {
      const recovery = await recoverConversationAnalysisEnqueues({
        repository,
        enqueue: queue.enqueue,
        limit: batchSize,
      });
      const counts = await runConversationAnalysisBatch({ worker, maxJobs: batchSize });
      console.info(JSON.stringify({
        event: "conversation_analysis_batch",
        recovery,
        ...counts,
        latencyMs: Date.now() - startedAt,
      }));
      await waitWithJitter(counts.claimed === 0 ? 1_000 : 100);
    } catch {
      console.error(JSON.stringify({
        event: "conversation_analysis_worker_error",
        errorCode: "CONVERSATION_ANALYSIS_WORKER_FAILED",
        latencyMs: Date.now() - startedAt,
      }));
      await waitWithJitter(1_000);
    }
  }
}

function positiveInteger(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : fallback;
}

function waitWithJitter(baseMs: number): Promise<void> {
  const jitterMs = Math.floor(Math.random() * Math.max(1, Math.floor(baseMs / 4)));
  return new Promise((resolve) => setTimeout(resolve, baseMs + jitterMs));
}

void main()
  .catch(() => {
    process.exitCode = 1;
  })
  .finally(async () => {
    await labsPrisma.$disconnect();
  });
