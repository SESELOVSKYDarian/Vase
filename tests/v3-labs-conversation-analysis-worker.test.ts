import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { ConversationAnalysisJob } from "../apps/vase-labs/app/lib/conversation-analysis-queue";
import {
  createConversationAnalysisWorker,
  MAX_CONVERSATION_ANALYSIS_BATCH_SIZE,
  recoverConversationAnalysisEnqueues,
  resolveConversationAnalysisBatchSize,
  resolveConversationAnalysisTimingConfig,
  runConversationAnalysisBatch,
  type ConversationAnalysisContext,
} from "../apps/vase-labs/app/lib/conversation-analysis-worker";
import {
  PrismaConversationAnalysisRepository,
  resolveAssistantOpenAiApiKey,
} from "../apps/vase-labs/app/lib/conversation-analysis-repository";
import { encryptChannelSecret } from "../apps/vase-labs/app/lib/channel-secrets";

const requestedAt = new Date("2026-07-23T12:00:00.000Z");
const job: ConversationAnalysisJob = {
  conversationId: "conversation_a",
  requestedThroughMessageId: "message_2",
  requestedThroughMessageCreatedAt: requestedAt,
  requestedAt,
  status: "PROCESSING",
  attempts: 1,
  leaseToken: "lease_a",
  leaseExpiresAt: new Date("2026-07-23T12:01:00.000Z"),
  lastError: null,
  createdAt: requestedAt,
  updatedAt: requestedAt,
};

const settings = {
  version: 3,
  hotLeadThreshold: 80,
  weights: {
    purchaseIntent: 25,
    productDefined: 15,
    budgetAcceptance: 15,
    urgency: 15,
    contactOrFulfillmentData: 10,
    interactionDepth: 10,
    objectionsOrNegativeSignals: -10,
  },
};

const generated = {
  insight: {
    summary: "Resumen",
    currentNeed: "Necesidad",
    productInterests: ["A"],
    preferences: [],
    objections: [],
    budgetSignals: [],
    urgencySignals: [],
    recommendations: ["B"],
    nextBestAction: "Responder",
    scoreReasons: ["Interés"],
    leadScore: 85,
    intentLabel: "HOT_LEAD" as const,
    identitySignals: [],
  },
  inputTokens: 11,
  outputTokens: 9,
  model: "gpt-analysis",
};

function context(overrides: Partial<ConversationAnalysisContext> = {}): ConversationAnalysisContext {
  return {
    conversationId: "conversation_a",
    assistantId: "assistant_a",
    globalTenantId: "tenant_a",
    channel: "INSTAGRAM",
    assistantModel: null,
    openAiApiKey: "assistant-openai-key",
    settings,
    activeHandoff: false,
    requestedHandoff: false,
    messages: [
      { id: "message_2", role: "assistant", content: "Segundo", createdAt: requestedAt },
      { id: "message_1", role: "user", content: "Primero", createdAt: new Date("2026-07-23T11:59:00.000Z") },
    ],
    ...overrides,
  };
}

function harness(overrides: {
  loaded?: ConversationAnalysisContext | null;
  completion?: "COMPLETED" | "REQUEUED" | "LEASE_LOST";
  failure?: "RETRY_QUEUED" | "FAILED" | "LEASE_LOST";
  generate?: () => Promise<typeof generated>;
} = {}) {
  const publishInsight = vi.fn(async () => undefined);
  const registerTokenUsage = vi.fn(async () => ({ totalTokens: 20 }));
  const complete = vi.fn(async (input: { publish: () => Promise<void> }) => {
    if ((overrides.completion ?? "COMPLETED") === "COMPLETED") await input.publish();
    return overrides.completion ?? "COMPLETED";
  });
  const fail = vi.fn(async () => overrides.failure ?? "RETRY_QUEUED");
  const generate = vi.fn(overrides.generate ?? (async () => generated));
  const createGenerator = vi.fn(() => ({ generate }));
  const loadAnalysisContext = vi.fn(async () =>
    Object.prototype.hasOwnProperty.call(overrides, "loaded") ? overrides.loaded! : context(),
  );
  const worker = createConversationAnalysisWorker({
    queue: { claimNext: async () => job, complete, fail },
    repository: { loadAnalysisContext, publishInsight },
    createGenerator,
    registerTokenUsage,
    clock: () => new Date("2026-07-23T12:00:30.000Z"),
  });
  return {
    worker, publishInsight, registerTokenUsage, complete, fail, generate,
    createGenerator, loadAnalysisContext,
  };
}

describe("conversation analysis worker", () => {
  it("polls a bounded batch and stops early when the queue becomes idle", async () => {
    const processNext = vi.fn()
      .mockResolvedValueOnce({
        status: "COMPLETED",
        conversationId: "c1",
        inputTokens: 11,
        outputTokens: 9,
        analysisVersion: 3,
        queueAgeMs: 30_000,
        attempt: 1,
        latencyMs: 25,
      })
      .mockResolvedValueOnce({
        status: "RETRY_QUEUED",
        conversationId: "c2",
        errorCode: "CONVERSATION_ANALYSIS_FAILED",
        inputTokens: 0,
        outputTokens: 0,
        analysisVersion: 4,
        queueAgeMs: 60_000,
        attempt: 2,
        latencyMs: 10,
      })
      .mockResolvedValueOnce({ status: "IDLE" });

    await expect(runConversationAnalysisBatch({ worker: { processNext }, maxJobs: 10 }))
      .resolves.toEqual({
        claimed: 2,
        completed: 1,
        requeued: 1,
        failed: 0,
        leaseLost: 0,
        errorCodes: ["CONVERSATION_ANALYSIS_FAILED"],
        inputTokens: 11,
        outputTokens: 9,
        analysisVersions: [3, 4],
        maxQueueAgeMs: 60_000,
        maxAttempt: 2,
        jobLatencyMs: 35,
      });
    expect(processNext).toHaveBeenCalledTimes(3);
  });

  it("stops before claiming another job when termination arrives during a batch", async () => {
    let stopping = false;
    const processNext = vi.fn(async () => {
      stopping = true;
      return {
        status: "COMPLETED" as const,
        conversationId: "c1",
        inputTokens: 1,
        outputTokens: 1,
        analysisVersion: 1,
        queueAgeMs: 1,
        attempt: 1,
        latencyMs: 1,
      };
    });

    const result = await runConversationAnalysisBatch({
      worker: { processNext },
      maxJobs: 10,
      shouldStop: () => stopping,
    });

    expect(result.claimed).toBe(1);
    expect(processNext).toHaveBeenCalledTimes(1);
  });

  it("caps configured and runtime batch sizes at a finite hard maximum", async () => {
    expect(MAX_CONVERSATION_ANALYSIS_BATCH_SIZE).toBe(100);
    expect(resolveConversationAnalysisBatchSize("1000", 10)).toBe(100);
    expect(resolveConversationAnalysisBatchSize("Infinity", 10)).toBe(10);
    expect(resolveConversationAnalysisBatchSize("-1", 10)).toBe(10);

    const processNext = vi.fn(async () => ({
      status: "COMPLETED" as const,
      conversationId: "c",
      inputTokens: 0,
      outputTokens: 0,
      analysisVersion: 1,
      queueAgeMs: 0,
      attempt: 1,
      latencyMs: 0,
    }));
    await runConversationAnalysisBatch({ worker: { processNext }, maxJobs: 10_000 });
    expect(processNext).toHaveBeenCalledTimes(100);
  });

  it("validates timeout and heartbeat strictly inside the lease", () => {
    expect(resolveConversationAnalysisTimingConfig({})).toEqual({
      leaseDurationMs: 60_000,
      requestTimeoutMs: 45_000,
      heartbeatIntervalMs: 15_000,
    });
    expect(() => resolveConversationAnalysisTimingConfig({
      leaseDurationMs: "60000",
      requestTimeoutMs: "59000",
      heartbeatIntervalMs: "15000",
    })).toThrow("INVALID_CONVERSATION_ANALYSIS_TIMING_CONFIG");
    expect(() => resolveConversationAnalysisTimingConfig({
      leaseDurationMs: "Infinity",
    })).toThrow("INVALID_CONVERSATION_ANALYSIS_TIMING_CONFIG");
    expect(() => resolveConversationAnalysisTimingConfig({
      heartbeatIntervalMs: "40000",
    })).toThrow("INVALID_CONVERSATION_ANALYSIS_TIMING_CONFIG");
  });

  it("recovers durable enqueue-failure markers in bounded batches", async () => {
    const enqueue = vi.fn(async () => undefined);
    const clear = vi.fn(async () => undefined);
    const list = vi.fn(async () => [
      {
        conversationId: "c1",
        assistantId: "a1",
        messageId: "m1",
        messageCreatedAt: requestedAt,
      },
    ]);

    await expect(recoverConversationAnalysisEnqueues({
      repository: {
        listFailedEnqueueCandidates: list,
        clearFailedEnqueueMarker: clear,
      },
      enqueue,
      limit: 5,
    })).resolves.toEqual({ recovered: 1, failed: 0 });
    expect(list).toHaveBeenCalledWith(5);
    expect(enqueue).toHaveBeenCalledWith({
      conversationId: "c1",
      requestedThroughMessageId: "m1",
      requestedThroughMessageCreatedAt: requestedAt,
    });
    expect(clear).toHaveBeenCalledWith({
      conversationId: "c1",
      assistantId: "a1",
      messageId: "m1",
    });
  });

  it("loads only the claimed boundary and sends messages chronologically", async () => {
    const test = harness();
    await test.worker.processNext();

    expect(test.loadAnalysisContext).toHaveBeenCalledWith({
      conversationId: "conversation_a",
      requestedThroughMessageId: "message_2",
    });
    expect(test.createGenerator).toHaveBeenCalledWith({
      apiKey: "assistant-openai-key",
    });
    expect(test.generate.mock.calls[0]?.[0].messages.map((message) => message.id))
      .toEqual(["message_1", "message_2"]);
  });

  it("returns safe per-job observability metrics", async () => {
    const test = harness();
    await expect(test.worker.processNext()).resolves.toMatchObject({
      status: "COMPLETED",
      conversationId: "conversation_a",
      inputTokens: 11,
      outputTokens: 9,
      analysisVersion: 3,
      queueAgeMs: 30_000,
      attempt: 1,
      latencyMs: 0,
    });
  });

  it("aborts in-flight inference on termination and safely requeues persisted work", async () => {
    const controller = new AbortController();
    let observedSignal: AbortSignal | undefined;
    const test = harness({
      generate: async (...args: unknown[]) => {
        observedSignal = (args[0] as { signal?: AbortSignal }).signal;
        return new Promise<typeof generated>((_resolve, reject) => {
          observedSignal?.addEventListener("abort", () => reject(new Error("aborted")), {
            once: true,
          });
        });
      },
    });

    const pending = test.worker.processNext({ signal: controller.signal });
    await vi.waitFor(() => expect(observedSignal).toBeDefined());
    controller.abort();

    await expect(pending).resolves.toMatchObject({
      status: "RETRY_QUEUED",
      errorCode: "CONVERSATION_ANALYSIS_FAILED",
    });
    expect(test.fail).toHaveBeenCalledOnce();
  });

  it("renews the lease while model inference remains in flight", async () => {
    let heartbeat: (() => void) | undefined;
    let resolveGeneration: ((value: typeof generated) => void) | undefined;
    const renewLease = vi.fn(async () => "RENEWED" as const);
    const generate = vi.fn(async () => new Promise<typeof generated>((resolve) => {
      resolveGeneration = resolve;
    }));
    const worker = createConversationAnalysisWorker({
      queue: {
        claimNext: async () => job,
        complete: async ({ publish }) => {
          await publish();
          return "COMPLETED";
        },
        fail: async () => "RETRY_QUEUED",
        renewLease,
      },
      repository: {
        loadAnalysisContext: async () => context(),
        publishInsight: async () => undefined,
      },
      createGenerator: () => ({ generate }),
      registerTokenUsage: async () => ({ totalTokens: 20 }),
      clock: () => new Date("2026-07-23T12:00:30.000Z"),
      heartbeat: {
        intervalMs: 15_000,
        start(callback) {
          heartbeat = callback;
          return "timer";
        },
        stop: vi.fn(),
      },
    });

    const pending = worker.processNext();
    await vi.waitFor(() => expect(heartbeat).toBeDefined());
    heartbeat?.();
    await vi.waitFor(() => expect(renewLease).toHaveBeenCalledOnce());
    resolveGeneration?.(generated);

    await expect(pending).resolves.toMatchObject({ status: "COMPLETED" });
    expect(renewLease).toHaveBeenCalledWith({
      conversationId: "conversation_a",
      leaseToken: "lease_a",
    });
  });

  it("atomically publishes the insight/projection through queue completion", async () => {
    const test = harness();
    const result = await test.worker.processNext();

    expect(result).toMatchObject({ status: "COMPLETED", conversationId: "conversation_a" });
    expect(test.complete).toHaveBeenCalledWith(expect.objectContaining({
      conversationId: "conversation_a",
      leaseToken: "lease_a",
      analyzedThroughMessageId: "message_2",
      publish: expect.any(Function),
    }));
    expect(test.publishInsight).toHaveBeenCalledWith(expect.objectContaining({
      conversationId: "conversation_a",
      assistantId: "assistant_a",
      globalTenantId: "tenant_a",
      analyzedThroughMessageId: "message_2",
      analysisVersion: 3,
      insight: expect.objectContaining({ summary: "Resumen", intentLabel: "HOT_LEAD" }),
    }));
  });

  it("gives HUMAN_REQUESTED priority from active system handoff state", async () => {
    const test = harness({ loaded: context({ activeHandoff: true }) });
    await test.worker.processNext();

    expect(test.publishInsight.mock.calls[0]?.[0].insight.intentLabel).toBe("HUMAN_REQUESTED");
  });

  it("registers tokens with the conversation_analysis source and tenant/channel", async () => {
    const test = harness();
    await test.worker.processNext();

    expect(test.registerTokenUsage).toHaveBeenCalledWith({
      globalTenantId: "tenant_a",
      channel: "INSTAGRAM",
      inputTokens: 11,
      outputTokens: 9,
      conversationId: "conversation_a",
      assistantId: "assistant_a",
      source: "conversation_analysis",
    });
  });

  it("does not register usage when the conversation channel is null", async () => {
    const test = harness({ loaded: context({ channel: null }) });
    await test.worker.processNext();
    expect(test.registerTokenUsage).not.toHaveBeenCalled();
  });

  it("does not publish a stale completion and reports the requeue", async () => {
    const test = harness({ completion: "REQUEUED" });
    const result = await test.worker.processNext();

    expect(result.status).toBe("REQUEUED");
    expect(test.publishInsight).not.toHaveBeenCalled();
  });

  it("preserves the last insight by failing through the queue without publishing", async () => {
    const test = harness({
      generate: async () => { throw new Error("raw transcript must not escape"); },
      failure: "RETRY_QUEUED",
    });
    const result = await test.worker.processNext();

    expect(result).toMatchObject({ status: "RETRY_QUEUED", errorCode: "CONVERSATION_ANALYSIS_FAILED" });
    expect(test.fail).toHaveBeenCalledWith({
      conversationId: "conversation_a",
      leaseToken: "lease_a",
      error: "CONVERSATION_ANALYSIS_FAILED",
    });
    expect(test.publishInsight).not.toHaveBeenCalled();
  });

  it("returns IDLE without touching repositories when no job is claimable", async () => {
    const test = harness();
    const idle = createConversationAnalysisWorker({
      queue: { claimNext: async () => null, complete: test.complete, fail: test.fail },
      repository: {
        loadAnalysisContext: test.loadAnalysisContext,
        publishInsight: test.publishInsight,
      },
      createGenerator: test.createGenerator,
      registerTokenUsage: test.registerTokenUsage,
      clock: () => new Date(),
    });
    await expect(idle.processNext()).resolves.toEqual({ status: "IDLE" });
    expect(test.loadAnalysisContext).not.toHaveBeenCalled();
  });
});

describe("Prisma conversation analysis repository boundaries", () => {
  it("locks the parent row before loading and persisting a job in one short transaction", async () => {
    const events: string[] = [];
    let lockSql = "";
    let transactionOptions: unknown;
    const transaction = {
      $queryRaw: vi.fn(async (strings: TemplateStringsArray) => {
        events.push("lock");
        lockSql = strings.join("?");
        return [{ id: "conversation_a" }];
      }),
      conversationAnalysisJob: {
        findUnique: vi.fn(async () => {
          events.push("load");
          return job;
        }),
        upsert: vi.fn(async () => {
          events.push("persist");
          return job;
        }),
      },
    };
    const prisma = {
      $transaction: vi.fn(async (
        operation: (tx: typeof transaction) => Promise<unknown>,
        options: unknown,
      ) => {
        transactionOptions = options;
        return operation(transaction);
      }),
    };
    const repository = new PrismaConversationAnalysisRepository(prisma as never);

    await expect(repository.withJob("conversation_a", (current) => ({
      job: current!,
      result: "ok",
    }))).resolves.toBe("ok");

    expect(events).toEqual(["lock", "load", "persist"]);
    expect(lockSql).toContain("FROM Conversation");
    expect(lockSql).toContain("FOR UPDATE");
    expect(transactionOptions).toEqual({ maxWait: 5_000, timeout: 10_000 });
  });

  it("uses an indexed durable analysisPendingAt field for recovery", async () => {
    let recoverySql = "";
    const prisma = {
      $queryRaw: vi.fn(async (strings: TemplateStringsArray) => {
        recoverySql = strings.join("?");
        return [];
      }),
    };
    const repository = new PrismaConversationAnalysisRepository(prisma as never);
    await repository.listFailedEnqueueCandidates(10);

    expect(recoverySql).toContain("m.analysisPendingAt IS NOT NULL");
    expect(recoverySql).toContain("ORDER BY m.analysisPendingAt ASC, m.id ASC");
    expect(recoverySql).not.toContain("JSON_EXTRACT");

    const schema = readFileSync("apps/vase-labs/prisma/schema.prisma", "utf8");
    const migration = readFileSync(
      "apps/vase-labs/prisma/migrations/20260723200000_analysis_pending_index/migration.sql",
      "utf8",
    );
    expect(schema).toContain("analysisPendingAt DateTime?");
    expect(schema).toContain("@@index([analysisPendingAt, id])");
    expect(migration).toContain("ADD COLUMN `analysisPendingAt`");
    expect(migration).toContain("Message_analysisPendingAt_id_idx");
    expect(migration).toContain(
      "WHERE JSON_EXTRACT(`metadata`, '$.conversationAnalysisPending') = true",
    );
    expect(migration).toContain("SET `analysisPendingAt` = `createdAt`");
  });

  it("prefers and decrypts the assistant-specific OpenAI secret", () => {
    const encryptedValue = encryptChannelSecret("assistant-key", "encryption-key");
    expect(resolveAssistantOpenAiApiKey({
      encryptedValue,
      env: {
        TOKEN_ENCRYPTION_SECRET: "encryption-key",
        OPENAI_API_KEY: "global-key",
      } as NodeJS.ProcessEnv,
    })).toBe("assistant-key");
  });

  it("falls back to OPENAI_API_KEY only when no assistant secret exists", () => {
    expect(resolveAssistantOpenAiApiKey({
      encryptedValue: null,
      env: { OPENAI_API_KEY: "global-key" } as NodeJS.ProcessEnv,
    })).toBe("global-key");
  });

  it("fails safely when assistant secret decryption cannot be configured or completed", () => {
    expect(() => resolveAssistantOpenAiApiKey({
      encryptedValue: "",
      env: { OPENAI_API_KEY: "global-key" } as NodeJS.ProcessEnv,
    })).toThrow("OPENAI_ASSISTANT_KEY_DECRYPT_FAILED");
    expect(() => resolveAssistantOpenAiApiKey({
      encryptedValue: "encrypted",
      env: { OPENAI_API_KEY: "global-key" } as NodeJS.ProcessEnv,
    })).toThrow("TOKEN_ENCRYPTION_SECRET_MISSING");
    expect(() => resolveAssistantOpenAiApiKey({
      encryptedValue: "not-a-valid-secret",
      env: {
        TOKEN_ENCRYPTION_SECRET: "encryption-key",
        OPENAI_API_KEY: "global-key",
      } as NodeJS.ProcessEnv,
    })).toThrow("OPENAI_ASSISTANT_KEY_DECRYPT_FAILED");
  });

  it("rejects publication when assistant and tenant do not match the conversation", async () => {
    const transaction = {
      $queryRaw: vi.fn(async () => []),
      conversation: {
        findFirst: vi.fn(async () => null),
        updateMany: vi.fn(),
      },
      message: { findFirst: vi.fn() },
      handoff: { findFirst: vi.fn(async () => null) },
      conversationInsight: { upsert: vi.fn() },
    };
    const prisma = {
      $transaction: async (operation: (tx: typeof transaction) => Promise<unknown>) =>
        operation(transaction),
    };
    const repository = new PrismaConversationAnalysisRepository(prisma as never);

    await expect(repository.publishInsight({
      conversationId: "conversation_a",
      assistantId: "assistant_other",
      globalTenantId: "tenant_other",
      analysisVersion: 3,
      analyzedThroughMessageId: "message_2",
      analyzedAt: requestedAt,
      insight: generated.insight,
    })).rejects.toThrow("CONVERSATION_ANALYSIS_CONTEXT_NOT_FOUND");
    expect(transaction.conversation.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        id: "conversation_a",
        assistantId: "assistant_other",
        assistant: { globalTenantId: "tenant_other" },
      },
    }));
    expect(transaction.conversationInsight.upsert).not.toHaveBeenCalled();
  });

  it("writes the insight and conversation projection in the same transaction", async () => {
    const transaction = {
      $queryRaw: vi.fn(async () => []),
      conversation: {
        findFirst: vi.fn(async () => ({ id: "conversation_a" })),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      message: {
        findFirst: vi.fn(async () => ({ id: "message_2", createdAt: requestedAt })),
      },
      handoff: { findFirst: vi.fn(async () => null) },
      conversationInsight: { upsert: vi.fn(async () => ({})) },
    };
    const prisma = {
      $transaction: vi.fn(async (operation: (tx: typeof transaction) => Promise<unknown>) =>
        operation(transaction)),
    };
    const repository = new PrismaConversationAnalysisRepository(prisma as never);

    await repository.publishInsight({
      conversationId: "conversation_a",
      assistantId: "assistant_a",
      globalTenantId: "tenant_a",
      analysisVersion: 3,
      analyzedThroughMessageId: "message_2",
      analyzedAt: requestedAt,
      insight: generated.insight,
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(transaction.conversationInsight.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { conversationId: "conversation_a" },
      create: expect.objectContaining({ conversationId: "conversation_a", summary: "Resumen" }),
      update: expect.objectContaining({ analyzedThroughMessageId: "message_2" }),
    }));
    expect(transaction.conversation.updateMany).toHaveBeenCalledWith({
      where: { id: "conversation_a", assistantId: "assistant_a" },
      data: { summary: "Resumen", intentLabel: "HOT_LEAD", intentScore: 85 },
    });
  });

  it("rejects publication when a newer durable inbound exists before its queue upsert", async () => {
    const transaction = {
      $queryRaw: vi.fn(async () => []),
      conversation: {
        findFirst: vi.fn(async () => ({ id: "conversation_a" })),
        updateMany: vi.fn(),
      },
      message: {
        findFirst: vi.fn(async () => ({
          id: "message_3",
          createdAt: new Date("2026-07-23T12:01:00.000Z"),
        })),
      },
      handoff: { findFirst: vi.fn(async () => null) },
      conversationInsight: { upsert: vi.fn() },
    };
    const prisma = {
      $transaction: async (operation: (tx: typeof transaction) => Promise<unknown>) =>
        operation(transaction),
    };
    const repository = new PrismaConversationAnalysisRepository(prisma as never);

    await expect(repository.publishInsight({
      conversationId: "conversation_a",
      assistantId: "assistant_a",
      globalTenantId: "tenant_a",
      analysisVersion: 3,
      analyzedThroughMessageId: "message_2",
      analyzedAt: requestedAt,
      insight: generated.insight,
    })).rejects.toThrow("CONVERSATION_ANALYSIS_STALE");
    expect(transaction.message.findFirst).toHaveBeenCalledWith({
      where: {
        conversationId: "conversation_a",
        direction: "INBOUND",
        conversation: {
          assistantId: "assistant_a",
          assistant: { globalTenantId: "tenant_a" },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true },
    });
    expect(transaction.conversationInsight.upsert).not.toHaveBeenCalled();
  });

  it("re-reads handoff state in the publish transaction and keeps both labels aligned", async () => {
    const transaction = {
      $queryRaw: vi.fn(async () => []),
      conversation: {
        findFirst: vi.fn(async () => ({
          id: "conversation_a",
          status: "OPEN",
          escalatedToHuman: false,
        })),
        updateMany: vi.fn(async () => ({ count: 1 })),
      },
      handoff: {
        findFirst: vi.fn(async () => ({ id: "handoff_new" })),
      },
      message: {
        findFirst: vi.fn(async () => ({ id: "message_2" })),
      },
      conversationInsight: { upsert: vi.fn(async () => ({})) },
    };
    const prisma = {
      $transaction: async (operation: (tx: typeof transaction) => Promise<unknown>) =>
        operation(transaction),
    };
    const repository = new PrismaConversationAnalysisRepository(prisma as never);

    await repository.publishInsight({
      conversationId: "conversation_a",
      assistantId: "assistant_a",
      globalTenantId: "tenant_a",
      analysisVersion: 3,
      analyzedThroughMessageId: "message_2",
      analyzedAt: requestedAt,
      insight: generated.insight,
    });

    expect(String(transaction.$queryRaw.mock.calls[0]?.[0]))
      .toContain("FOR UPDATE");
    expect(transaction.conversationInsight.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ intentLabel: "HUMAN_REQUESTED" }),
      update: expect.objectContaining({ intentLabel: "HUMAN_REQUESTED" }),
    }));
    expect(transaction.conversation.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ intentLabel: "HUMAN_REQUESTED" }),
    }));
  });

  it("loads a bounded latest window and returns it chronologically", async () => {
    const findMany = vi.fn(async () => [
      { id: "m2", role: "assistant", content: "Segundo", createdAt: requestedAt },
      { id: "m1", role: "user", content: "Primero", createdAt: new Date("2026-07-23T11:59:00.000Z") },
    ]);
    const findConversation = vi.fn(async () => ({
      id: "conversation_a",
      assistantId: "assistant_a",
      channel: "INSTAGRAM",
      status: "OPEN",
      escalatedToHuman: false,
      assistant: {
        globalTenantId: "tenant_a",
        model: "reply-model",
        secrets: [],
        conversationInsightSettings: null,
      },
    }));
    const prisma = {
      conversation: {
        findFirst: findConversation,
      },
      message: {
        findFirst: vi.fn(async () => ({
          id: "m2",
          createdAt: requestedAt,
          metadata: { aiBlockedReason: "HANDOFF_REQUESTED" },
        })),
        findMany,
      },
      handoff: { findFirst: vi.fn(async () => null) },
    };
    const repository = new PrismaConversationAnalysisRepository(prisma as never);
    const loaded = await repository.loadAnalysisContext({
      conversationId: "conversation_a",
      requestedThroughMessageId: "m2",
    });

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 200,
    }));
    expect(findConversation).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        assistant: {
          select: expect.objectContaining({
            secrets: {
              where: { kind: "OPENAI_API_KEY" },
              take: 1,
              select: { encryptedValue: true },
            },
          }),
        },
      }),
    }));
    expect(loaded?.messages.map((message) => message.id)).toEqual(["m1", "m2"]);
    expect(loaded?.requestedHandoff).toBe(true);
  });
});
