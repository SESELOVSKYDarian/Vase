export const CONVERSATION_ANALYSIS_JOB_STATUSES = [
  "QUEUED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
] as const;

export type ConversationAnalysisJobStatus = (typeof CONVERSATION_ANALYSIS_JOB_STATUSES)[number];

export interface ConversationAnalysisJob {
  conversationId: string;
  requestedThroughMessageId: string;
  requestedThroughMessageCreatedAt: Date;
  status: ConversationAnalysisJobStatus;
  attempts: number;
  leaseToken: string | null;
  leaseExpiresAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationAnalysisQueueRepository {
  /**
   * Returns queued jobs below the retry limit and every expired PROCESSING job.
   * Exhausted expired jobs must remain candidates so claimNext can finalize them
   * as FAILED while holding the per-conversation lock.
   */
  listClaimableConversationIds(input: {
    now: Date;
    maxAttempts: number;
    limit: number;
  }): Promise<string[]>;
  /**
   * Executes the operation under an exclusive per-conversation transaction or lock.
   * The current job must be the latest committed value, and the returned job must be
   * committed atomically before the lock is released. Implementations must therefore
   * make concurrent operations for the same conversation linearizable.
   */
  withJob<TResult>(
    conversationId: string,
    operation: (
      current: ConversationAnalysisJob | null,
    ) => Promise<{ job: ConversationAnalysisJob; result: TResult }>
      | { job: ConversationAnalysisJob; result: TResult },
  ): Promise<TResult>;
}

export interface ConversationAnalysisQueueDependencies {
  repository: ConversationAnalysisQueueRepository;
  clock: () => Date;
  tokenFactory: () => string;
  maxAttempts: number;
  leaseDurationMs: number;
  claimBatchSize?: number;
}

export type ConversationAnalysisCompletion = "COMPLETED" | "REQUEUED" | "LEASE_LOST";
export type ConversationAnalysisFailure = "RETRY_QUEUED" | "FAILED" | "LEASE_LOST";

function isClaimable(job: ConversationAnalysisJob, now: Date, maxAttempts: number) {
  if (job.attempts >= maxAttempts) return false;
  if (job.status === "QUEUED") return true;
  return job.status === "PROCESSING"
    && job.leaseExpiresAt !== null
    && job.leaseExpiresAt.getTime() <= now.getTime();
}

function safeFailureCode() {
  return "CONVERSATION_ANALYSIS_FAILED";
}

function isNewerRequest(input: {
  messageId: string;
  messageCreatedAt: Date;
}, current: ConversationAnalysisJob) {
  const timeDifference = input.messageCreatedAt.getTime()
    - current.requestedThroughMessageCreatedAt.getTime();
  return timeDifference > 0
    || (timeDifference === 0 && input.messageId.localeCompare(current.requestedThroughMessageId) > 0);
}

export function createConversationAnalysisQueue(dependencies: ConversationAnalysisQueueDependencies) {
  const maxAttempts = Math.floor(dependencies.maxAttempts);
  const leaseDurationMs = Math.floor(dependencies.leaseDurationMs);
  const claimBatchSize = Math.floor(dependencies.claimBatchSize ?? 25);
  if (
    !Number.isFinite(maxAttempts)
    || !Number.isFinite(leaseDurationMs)
    || !Number.isFinite(claimBatchSize)
    || maxAttempts < 1
    || leaseDurationMs < 1
    || claimBatchSize < 1
  ) {
    throw new Error("INVALID_CONVERSATION_ANALYSIS_QUEUE_CONFIG");
  }

  return {
    enqueue(input: {
      conversationId: string;
      requestedThroughMessageId: string;
      requestedThroughMessageCreatedAt: Date;
    }) {
      return dependencies.repository.withJob(input.conversationId, (current) => {
        const now = dependencies.clock();
        if (!current) {
          const created: ConversationAnalysisJob = {
            conversationId: input.conversationId,
            requestedThroughMessageId: input.requestedThroughMessageId,
            requestedThroughMessageCreatedAt: input.requestedThroughMessageCreatedAt,
            status: "QUEUED",
            attempts: 0,
            leaseToken: null,
            leaseExpiresAt: null,
            lastError: null,
            createdAt: now,
            updatedAt: now,
          };
          return { job: created, result: created };
        }
        if (current.requestedThroughMessageId === input.requestedThroughMessageId) {
          return { job: current, result: current };
        }
        if (!isNewerRequest({
          messageId: input.requestedThroughMessageId,
          messageCreatedAt: input.requestedThroughMessageCreatedAt,
        }, current)) {
          return { job: current, result: current };
        }
        const next: ConversationAnalysisJob = current.status === "PROCESSING"
          ? {
              ...current,
              requestedThroughMessageId: input.requestedThroughMessageId,
              requestedThroughMessageCreatedAt: input.requestedThroughMessageCreatedAt,
              attempts: 0,
              updatedAt: now,
            }
          : {
              ...current,
              requestedThroughMessageId: input.requestedThroughMessageId,
              requestedThroughMessageCreatedAt: input.requestedThroughMessageCreatedAt,
              status: "QUEUED",
              attempts: 0,
              leaseToken: null,
              leaseExpiresAt: null,
              lastError: null,
              updatedAt: now,
            };
        return { job: next, result: next };
      });
    },

    async claimNext(): Promise<ConversationAnalysisJob | null> {
      const listedAt = dependencies.clock();
      const conversationIds = await dependencies.repository.listClaimableConversationIds({
        now: listedAt,
        maxAttempts,
        limit: claimBatchSize,
      });
      for (const conversationId of conversationIds) {
        const claimed = await dependencies.repository.withJob<ConversationAnalysisJob | null>(
          conversationId,
          (current) => {
            if (!current) throw new Error("CONVERSATION_ANALYSIS_JOB_NOT_FOUND");
            const now = dependencies.clock();
            const expiredProcessingLease = current.status === "PROCESSING"
              && current.leaseExpiresAt !== null
              && current.leaseExpiresAt.getTime() <= now.getTime();
            if (expiredProcessingLease && current.attempts >= maxAttempts) {
              const failed: ConversationAnalysisJob = {
                ...current,
                status: "FAILED",
                leaseToken: null,
                leaseExpiresAt: null,
                lastError: "LEASE_EXPIRED_MAX_ATTEMPTS",
                updatedAt: now,
              };
              return { job: failed, result: null };
            }
            if (!isClaimable(current, now, maxAttempts)) {
              return { job: current, result: null };
            }
            const next: ConversationAnalysisJob = {
              ...current,
              status: "PROCESSING",
              attempts: current.attempts + 1,
              leaseToken: dependencies.tokenFactory(),
              leaseExpiresAt: new Date(now.getTime() + leaseDurationMs),
              lastError: null,
              updatedAt: now,
            };
            return { job: next, result: next };
          },
        );
        if (claimed) return claimed;
      }
      return null;
    },

    fail(input: {
      conversationId: string;
      leaseToken: string;
      error: unknown;
    }): Promise<ConversationAnalysisFailure> {
      return dependencies.repository.withJob(input.conversationId, (current) => {
        const now = dependencies.clock();
        if (!current) throw new Error("CONVERSATION_ANALYSIS_JOB_NOT_FOUND");
        if (current.status !== "PROCESSING" || current.leaseToken !== input.leaseToken) {
          return { job: current, result: "LEASE_LOST" as const };
        }
        const exhausted = current.attempts >= maxAttempts;
        const next: ConversationAnalysisJob = {
          ...current,
          status: exhausted ? "FAILED" : "QUEUED",
          leaseToken: null,
          leaseExpiresAt: null,
          lastError: safeFailureCode(),
          updatedAt: now,
        };
        return {
          job: next,
          result: exhausted ? "FAILED" as const : "RETRY_QUEUED" as const,
        };
      });
    },

    complete(input: {
      conversationId: string;
      leaseToken: string;
      analyzedThroughMessageId: string;
      publish: () => Promise<void>;
    }): Promise<ConversationAnalysisCompletion> {
      return dependencies.repository.withJob(input.conversationId, async (current) => {
        const now = dependencies.clock();
        if (!current) throw new Error("CONVERSATION_ANALYSIS_JOB_NOT_FOUND");
        if (current.status !== "PROCESSING" || current.leaseToken !== input.leaseToken) {
          return { job: current, result: "LEASE_LOST" as const };
        }
        if (current.requestedThroughMessageId !== input.analyzedThroughMessageId) {
          const requeued: ConversationAnalysisJob = {
            ...current,
            status: "QUEUED",
            attempts: 0,
            leaseToken: null,
            leaseExpiresAt: null,
            lastError: null,
            updatedAt: now,
          };
          return { job: requeued, result: "REQUEUED" as const };
        }

        await input.publish();
        const completed: ConversationAnalysisJob = {
          ...current,
          status: "COMPLETED",
          leaseToken: null,
          leaseExpiresAt: null,
          lastError: null,
          updatedAt: now,
        };
        return { job: completed, result: "COMPLETED" as const };
      });
    },
  };
}
