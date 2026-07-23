import { describe, expect, it } from "vitest";
import {
  createConversationAnalysisQueue,
  type ConversationAnalysisJob,
  type ConversationAnalysisQueueRepository,
  type ConversationAnalysisJobStatus,
} from "../apps/vase-labs/app/lib/conversation-analysis-queue";

class MemoryConversationAnalysisQueueRepository implements ConversationAnalysisQueueRepository {
  private readonly jobs = new Map<string, ConversationAnalysisJob>();

  seed(job: ConversationAnalysisJob) {
    this.jobs.set(job.conversationId, structuredClone(job));
  }

  get(conversationId: string) {
    const job = this.jobs.get(conversationId);
    return job ? structuredClone(job) : null;
  }

  async listClaimableConversationIds(input: {
    now: Date;
    maxAttempts: number;
    limit: number;
  }) {
    return [...this.jobs.values()]
      .filter((job) => {
        if (job.attempts >= input.maxAttempts) return false;
        if (job.status === "QUEUED") return true;
        return job.status === "PROCESSING"
          && job.leaseExpiresAt !== null
          && job.leaseExpiresAt.getTime() <= input.now.getTime();
      })
      .sort((left, right) => left.updatedAt.getTime() - right.updatedAt.getTime())
      .slice(0, input.limit)
      .map((job) => job.conversationId);
  }

  async withJob<TResult>(
    conversationId: string,
    operation: (
      current: ConversationAnalysisJob | null,
    ) => Promise<{ job: ConversationAnalysisJob; result: TResult }> | { job: ConversationAnalysisJob; result: TResult },
  ): Promise<TResult> {
    const current = this.get(conversationId);
    const { job, result } = await operation(current);
    this.jobs.set(conversationId, structuredClone(job));
    return result;
  }
}

function job(overrides: Partial<ConversationAnalysisJob> = {}): ConversationAnalysisJob {
  return {
    conversationId: "conversation_1",
    requestedThroughMessageId: "message_1",
    requestedThroughMessageCreatedAt: new Date("2026-07-23T12:00:01.000Z"),
    status: "QUEUED",
    attempts: 0,
    leaseToken: null,
    leaseExpiresAt: null,
    lastError: null,
    createdAt: new Date("2026-07-23T12:00:00.000Z"),
    updatedAt: new Date("2026-07-23T12:00:00.000Z"),
    ...overrides,
  };
}

function enqueueRequest(messageId: string, createdAt?: string) {
  const numericSuffix = Number(messageId.match(/\d+$/)?.[0] ?? 0);
  return {
    conversationId: "conversation_1",
    requestedThroughMessageId: messageId,
    requestedThroughMessageCreatedAt: new Date(
      createdAt ?? `2026-07-23T12:00:${String(numericSuffix).padStart(2, "0")}.000Z`,
    ),
  };
}

function queueHarness(options: {
  now?: Date;
  maxAttempts?: number;
  leaseDurationMs?: number;
} = {}) {
  const repository = new MemoryConversationAnalysisQueueRepository();
  let tokenIndex = 0;
  let now = options.now ?? new Date("2026-07-23T12:05:00.000Z");
  const queue = createConversationAnalysisQueue({
    repository,
    clock: () => new Date(now),
    tokenFactory: () => `lease_${++tokenIndex}`,
    maxAttempts: options.maxAttempts ?? 3,
    leaseDurationMs: options.leaseDurationMs ?? 60_000,
  });
  return {
    repository,
    queue,
    setNow(value: Date) {
      now = value;
    },
  };
}

describe("Labs durable conversation analysis queue", () => {
  it("coalesces multiple inbound requests to the latest requested message", async () => {
    const { queue, repository } = queueHarness();

    await queue.enqueue(enqueueRequest("message_1"));
    await queue.enqueue(enqueueRequest("message_3"));

    expect(repository.get("conversation_1")).toMatchObject({
      status: "QUEUED",
      requestedThroughMessageId: "message_3",
      attempts: 0,
    });
  });

  it("keeps the newest persisted message when enqueue calls arrive out of order", async () => {
    const { queue, repository } = queueHarness();

    await queue.enqueue(enqueueRequest("message_newer", "2026-07-23T12:00:02.000Z"));
    await queue.enqueue(enqueueRequest("message_older", "2026-07-23T12:00:01.000Z"));

    expect(repository.get("conversation_1")?.requestedThroughMessageId).toBe("message_newer");
  });

  it("reclaims an expired processing lease with a new token", async () => {
    const { queue, repository } = queueHarness();
    repository.seed(job({
      status: "PROCESSING",
      attempts: 1,
      leaseToken: "expired_token",
      leaseExpiresAt: new Date("2026-07-23T12:04:59.000Z"),
    }));

    const claimed = await queue.claimNext();

    expect(claimed).toMatchObject({
      status: "PROCESSING",
      attempts: 2,
      leaseToken: "lease_1",
      leaseExpiresAt: new Date("2026-07-23T12:06:00.000Z"),
    });
  });

  it("does not steal an unexpired processing lease", async () => {
    const { queue, repository } = queueHarness();
    repository.seed(job({
      status: "PROCESSING",
      attempts: 1,
      leaseToken: "valid_token",
      leaseExpiresAt: new Date("2026-07-23T12:05:01.000Z"),
    }));

    await expect(queue.claimNext()).resolves.toBeNull();
    expect(repository.get("conversation_1")).toMatchObject({
      status: "PROCESSING",
      attempts: 1,
      leaseToken: "valid_token",
    });
  });

  it("retries failures only through the configured maximum attempt", async () => {
    const { queue, repository } = queueHarness({ maxAttempts: 3 });
    await queue.enqueue(enqueueRequest("message_1"));

    const expectedStatuses: ConversationAnalysisJobStatus[] = ["QUEUED", "QUEUED", "FAILED"];
    for (const expectedStatus of expectedStatuses) {
      const claimed = await queue.claimNext();
      expect(claimed).not.toBeNull();
      await expect(queue.fail({
        conversationId: "conversation_1",
        leaseToken: claimed!.leaseToken!,
        error: new Error("provider unavailable"),
      })).resolves.toBe(expectedStatus === "FAILED" ? "FAILED" : "RETRY_QUEUED");
      expect(repository.get("conversation_1")?.status).toBe(expectedStatus);
    }

    await expect(queue.claimNext()).resolves.toBeNull();
    expect(repository.get("conversation_1")).toMatchObject({
      status: "FAILED",
      attempts: 3,
      lastError: "provider unavailable",
      leaseToken: null,
      leaseExpiresAt: null,
    });
  });

  it("gives a newer coalesced request its own retry budget", async () => {
    const { queue, repository } = queueHarness({ maxAttempts: 1 });
    await queue.enqueue(enqueueRequest("message_1"));
    const oldRequest = await queue.claimNext();
    await queue.enqueue(enqueueRequest("message_2"));

    await expect(queue.fail({
      conversationId: "conversation_1",
      leaseToken: oldRequest!.leaseToken!,
      error: "old request failed",
    })).resolves.toBe("RETRY_QUEUED");

    expect(repository.get("conversation_1")).toMatchObject({
      status: "QUEUED",
      requestedThroughMessageId: "message_2",
      attempts: 0,
    });
    await expect(queue.claimNext()).resolves.toMatchObject({
      status: "PROCESSING",
      requestedThroughMessageId: "message_2",
      attempts: 1,
    });
  });

  it("requeues a changed request instead of publishing a stale result", async () => {
    const { queue, repository } = queueHarness();
    await queue.enqueue(enqueueRequest("message_1"));
    const firstClaim = await queue.claimNext();
    await queue.enqueue(enqueueRequest("message_2"));
    let publishCount = 0;

    await expect(queue.complete({
      conversationId: "conversation_1",
      leaseToken: firstClaim!.leaseToken!,
      analyzedThroughMessageId: "message_1",
      publish: async () => {
        publishCount += 1;
      },
    })).resolves.toBe("REQUEUED");

    expect(publishCount).toBe(0);
    expect(repository.get("conversation_1")).toMatchObject({
      status: "QUEUED",
      requestedThroughMessageId: "message_2",
      attempts: 0,
      leaseToken: null,
    });

    const secondClaim = await queue.claimNext();
    await expect(queue.complete({
      conversationId: "conversation_1",
      leaseToken: secondClaim!.leaseToken!,
      analyzedThroughMessageId: "message_2",
      publish: async () => {
        publishCount += 1;
      },
    })).resolves.toBe("COMPLETED");
    expect(publishCount).toBe(1);
    expect(repository.get("conversation_1")?.status).toBe("COMPLETED");
  });

  it("rejects completion from a worker that no longer owns the lease", async () => {
    const { queue, repository } = queueHarness();
    repository.seed(job({
      status: "PROCESSING",
      attempts: 2,
      leaseToken: "current_token",
      leaseExpiresAt: new Date("2026-07-23T12:06:00.000Z"),
    }));
    let published = false;

    await expect(queue.complete({
      conversationId: "conversation_1",
      leaseToken: "old_token",
      analyzedThroughMessageId: "message_1",
      publish: async () => {
        published = true;
      },
    })).resolves.toBe("LEASE_LOST");

    expect(published).toBe(false);
    expect(repository.get("conversation_1")?.leaseToken).toBe("current_token");
  });

  it("rejects non-finite queue configuration", () => {
    const repository = new MemoryConversationAnalysisQueueRepository();
    const base = {
      repository,
      clock: () => new Date("2026-07-23T12:05:00.000Z"),
      tokenFactory: () => "lease",
      maxAttempts: 3,
      leaseDurationMs: 60_000,
    };

    expect(() => createConversationAnalysisQueue({ ...base, maxAttempts: Number.NaN })).toThrow(
      "INVALID_CONVERSATION_ANALYSIS_QUEUE_CONFIG",
    );
    expect(() => createConversationAnalysisQueue({ ...base, leaseDurationMs: Number.POSITIVE_INFINITY })).toThrow(
      "INVALID_CONVERSATION_ANALYSIS_QUEUE_CONFIG",
    );
  });
});
